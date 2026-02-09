const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const DIR = __dirname;

// Conversion state tracking
let convertStatus = { state: 'idle', progress: '', filename: '', error: '' };

// Locate cst_viewer binary
function findCstViewer() {
    if (process.env.CST_VIEWER && fs.existsSync(process.env.CST_VIEWER)) {
        return process.env.CST_VIEWER;
    }
    const candidates = [
        path.join(DIR, 'cst_viewer.exe'),
        path.join(DIR, 'cst_viewer'),
        path.join(DIR, '..', 'target', 'release', 'cst_viewer.exe'),
        path.join(DIR, '..', 'target', 'release', 'cst_viewer'),
    ];
    for (const c of candidates) {
        if (fs.existsSync(c)) return c;
    }
    return null;
}

const CST_VIEWER = findCstViewer();

const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.bin': 'application/octet-stream',
    '.json': 'application/json',
    '.css': 'text/css',
};

function serveFile(res, filePath, acceptEncoding) {
    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';

    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    const stat = fs.statSync(filePath);
    const useGzip = acceptEncoding && acceptEncoding.includes('gzip') && stat.size > 1024;

    if (useGzip) {
        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Encoding': 'gzip',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(filePath).pipe(zlib.createGzip({ level: 6 })).pipe(res);
    } else {
        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stat.size,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(filePath).pipe(res);
    }
}

const server = http.createServer((req, res) => {
    const ae = req.headers['accept-encoding'] || '';
    const url = req.url.split('?')[0];
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Filename',
            'Access-Control-Max-Age': '86400',
        });
        res.end();
        return;
    }

    if (url === '/' || url === '/index.html') {
        serveFile(res, path.join(DIR, 'index.html'), ae);
    } else if (url === '/api/upload' && method === 'POST') {
        // Handle IFC file upload
        if (!CST_VIEWER) {
            res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                success: false,
                error: 'cst_viewer not found. Set CST_VIEWER env or place binary in server directory.'
            }));
            return;
        }

        if (convertStatus.state === 'converting') {
            res.writeHead(409, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                success: false,
                error: 'Conversion already in progress'
            }));
            return;
        }

        const filename = req.headers['x-filename'] || 'upload.ifc';
        const tempDir = path.join(DIR, '.tmp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempPath = path.join(tempDir, filename);

        // Stream upload to temp file (max 2GB)
        const chunks = [];
        let totalSize = 0;
        const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

        req.on('data', chunk => {
            totalSize += chunk.length;
            if (totalSize > MAX_SIZE) {
                req.destroy();
                res.writeHead(413, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: false, error: 'File too large (max 2GB)' }));
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            const body = Buffer.concat(chunks);
            fs.writeFileSync(tempPath, body);

            // Start async conversion
            convertStatus = { state: 'converting', progress: '', filename, error: '' };

            const child = spawn(CST_VIEWER, ['--web', tempPath, DIR], {
                stdio: 'pipe',
                timeout: 600000, // 10 min
            });

            let stderr = '';
            child.stderr.on('data', data => {
                stderr += data.toString();
            });

            child.on('close', code => {
                try { fs.unlinkSync(tempPath); } catch {}

                if (code === 0) {
                    convertStatus = { state: 'done', filename, progress: 'Complete', error: '' };
                } else {
                    convertStatus = {
                        state: 'error',
                        filename,
                        progress: '',
                        error: `Conversion failed (exit ${code}): ${stderr.slice(0, 200)}`
                    };
                }
            });

            child.on('error', err => {
                try { fs.unlinkSync(tempPath); } catch {}
                convertStatus = {
                    state: 'error',
                    filename,
                    progress: '',
                    error: `Failed to spawn cst_viewer: ${err.message}`
                };
            });

            res.writeHead(202, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                success: true,
                message: 'Conversion started. Check /api/status for progress.'
            }));
        });

        req.on('error', err => {
            try { fs.unlinkSync(tempPath); } catch {}
            res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ success: false, error: err.message }));
        });
    } else if (url === '/api/status') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(convertStatus));
    } else if (url === '/api/mesh') {
        // Serve binary mesh data with gzip compression
        const binPath = path.join(DIR, 'mesh.bin');
        if (!fs.existsSync(binPath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'mesh.bin not found. Run: cst_viewer --web <ifc_file>' }));
            return;
        }
        const stat = fs.statSync(binPath);
        if (ae.includes('gzip')) {
            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Encoding': 'gzip',
                'X-Raw-Size': stat.size,
                'Access-Control-Allow-Origin': '*',
            });
            fs.createReadStream(binPath).pipe(zlib.createGzip({ level: 6 })).pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Length': stat.size,
                'Access-Control-Allow-Origin': '*',
            });
            fs.createReadStream(binPath).pipe(res);
        }
    } else if (url === '/api/info') {
        // Return model info from mesh.bin header
        const binPath = path.join(DIR, 'mesh.bin');
        if (!fs.existsSync(binPath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No mesh data' }));
            return;
        }
        const stat = fs.statSync(binPath);
        const fd = fs.openSync(binPath, 'r');
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);
        const meshCount = buf.readUInt32LE(0);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            meshCount,
            fileSize: stat.size,
            fileSizeMB: (stat.size / 1048576).toFixed(1),
        }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`  Port ${PORT} in use, killing existing process...`);
        const { execSync } = require('child_process');
        try {
            const out = execSync(`netstat -ano | findstr ":${PORT}" | findstr "LISTEN"`, { encoding: 'utf8' });
            const pids = [...new Set(out.trim().split('\n').map(l => l.trim().split(/\s+/).pop()))];
            for (const pid of pids) {
                try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' }); } catch {}
            }
            setTimeout(() => server.listen(PORT), 1000);
        } catch {
            console.error(`  Failed to free port ${PORT}. Use: set PORT=3001 && node server.js`);
            process.exit(1);
        }
    } else {
        throw err;
    }
});

server.listen(PORT, () => {
    const binPath = path.join(DIR, 'mesh.bin');
    const hasMesh = fs.existsSync(binPath);
    const meshSize = hasMesh ? (fs.statSync(binPath).size / 1048576).toFixed(1) : '0';

    console.log('');
    console.log('  CSTEngine IFC Web Viewer');
    console.log('  ========================');
    console.log(`  Server:       http://localhost:${PORT}`);
    console.log(`  Mesh data:    ${hasMesh ? meshSize + ' MB' : 'NOT FOUND'}`);
    console.log(`  cst_viewer:   ${CST_VIEWER || 'NOT FOUND - upload will fail'}`);
    console.log('');
    console.log('  Endpoints:');
    console.log(`    GET  /              Viewer page`);
    console.log(`    GET  /api/mesh      Binary mesh data`);
    console.log(`    GET  /api/info      Model metadata`);
    console.log(`    POST /api/upload    Upload IFC file for conversion`);
    console.log(`    GET  /api/status    Conversion status`);
    console.log('');
    if (!CST_VIEWER) {
        console.log('  WARNING: cst_viewer not found!');
        console.log('  Set CST_VIEWER env or place cst_viewer.exe in this directory.');
        console.log('');
    }
});

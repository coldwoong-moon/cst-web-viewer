const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;
const DIR = __dirname;

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

    if (url === '/' || url === '/index.html') {
        serveFile(res, path.join(DIR, 'index.html'), ae);
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
    console.log(`  Server:     http://localhost:${PORT}`);
    console.log(`  Mesh data:  ${hasMesh ? meshSize + ' MB' : 'NOT FOUND - run cst_viewer --web <ifc_file>'}`);
    console.log('');
    console.log('  Endpoints:');
    console.log(`    GET /           Viewer page`);
    console.log(`    GET /api/mesh   Binary mesh data`);
    console.log(`    GET /api/info   Model metadata`);
    console.log('');
});

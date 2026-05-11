const downloadBtn = document.getElementById('download-btn');
const urlInput = document.getElementById('github-url');
const statusContainer = document.getElementById('status-container');
const statusText = document.getElementById('status-text');
const progressPercent = document.getElementById('progress-percent');
const progressFill = document.getElementById('progress-fill');
const fileStatus = document.getElementById('file-status');
const btnText = downloadBtn.querySelector('.btn-text');
const btnIcon = downloadBtn.querySelector('[data-feather="download"]');
const spinner = downloadBtn.querySelector('.spinner');
const apiLimitInfo = document.getElementById('api-limit-info');

// Get API Limit on Load
updateApiLimit();

async function updateApiLimit() {
    try {
        const response = await fetch('https://api.github.com/rate_limit');
        if (response.ok) {
            const data = await response.json();
            const { remaining, limit } = data.rate;
            apiLimitInfo.textContent = `Limit API: ${remaining}/${limit} tersisa`;
            
            if (remaining === 0) {
                apiLimitInfo.style.color = '#ef4444';
            } else {
                apiLimitInfo.style.color = '';
            }
        }
    } catch (error) {
        console.error('Gagal ambil data limit:', error);
    }
}

downloadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
        alert('Masukkan URL GitHub-nya dulu ya!');
        return;
    }

    const githubData = parseGitHubUrl(url);
    if (!githubData) {
        alert('URL-nya nggak valid nih! Gunakan format: https://github.com/OWNER/REPO/tree/BRANCH/PATH');
        return;
    }

    startLoading();

    try {
        // Initialize JSZip for this download session
        const zip = new JSZip();

        updateStatus('Menghubungi GitHub API...', 5);
        const { owner, repo, branch, path } = githubData;
        const folderName = path.split('/').pop() || 'repo-folder';

        // 1. Get the tree from GitHub API
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
        const response = await fetch(treeUrl);
        
        if (!response.ok) {
            if (response.status === 403) throw new Error('Batas request API sudah habis. Coba lagi nanti ya.');
            if (response.status === 404) throw new Error('Repo atau Branch nggak ketemu.');
            throw new Error('Gagal ambil struktur data.');
        }

        const data = await response.json();
        
        // 2. Filter files within the specific path
        const normalizedPath = path.endsWith('/') ? path : path + '/';
        const filesToDownload = data.tree.filter(item => 
            item.path.startsWith(path) && item.type === 'blob'
        );

        if (filesToDownload.length === 0) {
            throw new Error('Foldernya kosong atau nggak ketemu.');
        }

        updateStatus(`Ditemukan ${filesToDownload.length} file. Mulai mengunduh...`, 10);

        // 3. Download each file
        let downloadedCount = 0;
        const totalFiles = filesToDownload.length;

        const downloadPromises = filesToDownload.map(async (file) => {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
            try {
                const fileResponse = await fetch(rawUrl);
                if (!fileResponse.ok) throw new Error(`Gagal mengunduh ${file.path}`);
                
                const blob = await fileResponse.blob();
                
                // Get relative path inside the target folder
                let relativePath = file.path.substring(path.length);
                if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);
                
                // Wrap files inside the parent folder
                const zipPath = `${folderName}/${relativePath}`;
                zip.file(zipPath, blob);
                
                downloadedCount++;
                const percent = Math.round((downloadedCount / totalFiles) * 80) + 10;
                updateStatus(`Mengunduh: ${file.path.split('/').pop()}`, percent);
                fileStatus.textContent = `File: ${file.path}`;
            } catch (err) {
                console.error(err);
            }
        });

        await Promise.all(downloadPromises);

        // 4. Generate and Save ZIP
        updateStatus('Lagi bikin file ZIP...', 95);
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${folderName}.zip`);

        updateStatus('Selesai!', 100);
        fileStatus.textContent = 'ZIP kamu sudah mulai diunduh.';
        setTimeout(stopLoading, 2000);
        
        // Refresh limit info after download
        updateApiLimit();

    } catch (error) {
        alert('Ada masalah nih: ' + error.message);
        stopLoading();
        updateApiLimit();
    }
});

function parseGitHubUrl(url) {
    // Regex to match: https://github.com/OWNER/REPO/tree/BRANCH/PATH
    const regex = /https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/;
    const match = url.match(regex);
    if (match) {
        return {
            owner: match[1],
            repo: match[2],
            branch: match[3],
            path: match[4].replace(/\/$/, '') // remove trailing slash
        };
    }
    return null;
}

function updateStatus(text, percent) {
    statusText.textContent = text;
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
}

function startLoading() {
    downloadBtn.disabled = true;
    btnText.textContent = 'Lagi diproses...';
    btnIcon.classList.add('hidden');
    spinner.classList.remove('hidden');
    statusContainer.classList.remove('hidden');
    updateStatus('Memulai...', 0);
}

function stopLoading() {
    downloadBtn.disabled = false;
    btnText.textContent = 'Unduh ZIP';
    btnIcon.classList.remove('hidden');
    spinner.classList.add('hidden');
    // Keep status container visible so user can see 100%
}

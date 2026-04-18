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

// Initialize JSZip
const zip = new JSZip();

downloadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
        alert('Silakan masukkan URL GitHub!');
        return;
    }

    const githubData = parseGitHubUrl(url);
    if (!githubData) {
        alert('URL tidak valid! Gunakan format: https://github.com/OWNER/REPO/tree/BRANCH/PATH');
        return;
    }

    startLoading();

    try {
        updateStatus('Menghubungi GitHub API...', 5);
        const { owner, repo, branch, path } = githubData;

        // 1. Get the tree from GitHub API
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
        const response = await fetch(treeUrl);
        
        if (!response.ok) {
            if (response.status === 403) throw new Error('API Rate Limit tercapai. Coba lagi nanti.');
            if (response.status === 404) throw new Error('Repositori atau Branch tidak ditemukan.');
            throw new Error('Gagal mengambil struktur data.');
        }

        const data = await response.json();
        
        // 2. Filter files within the specific path
        const normalizedPath = path.endsWith('/') ? path : path + '/';
        const filesToDownload = data.tree.filter(item => 
            item.path.startsWith(path) && item.type === 'blob'
        );

        if (filesToDownload.length === 0) {
            throw new Error('Folder kosong atau tidak ditemukan.');
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
                
                zip.file(relativePath, blob);
                
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
        updateStatus('Membuat file ZIP...', 95);
        const content = await zip.generateAsync({ type: 'blob' });
        const folderName = path.split('/').pop() || 'repo-folder';
        saveAs(content, `${folderName}.zip`);

        updateStatus('Selesai!', 100);
        fileStatus.textContent = 'Unduhan berhasil dimulai.';
        setTimeout(stopLoading, 2000);

    } catch (error) {
        alert('Terjadi kesalahan: ' + error.message);
        stopLoading();
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
    btnText.textContent = 'Memproses...';
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

// =====================================================
// media-library.js — Full Media Library UI Component
// =====================================================
//
// Renders a complete media management interface inside
// a container element on the admin Media page.
//
// Features:
//   - Drag & drop upload to R2
//   - Click to upload (file input)
//   - Folder sidebar (create, rename, delete, navigate)
//   - Media grid with thumbnails and type icons
//   - Search by filename / alt text
//   - Filter by type (all, images, videos, documents)
//   - Sort by date, name, or size
//   - Pagination
//   - Copy URL to clipboard
//   - Delete (with confirmation)
//   - Rename / edit metadata (alt text, caption)
//   - Replace file (upload new, keep metadata)
//   - Responsive grid
//   - Dark mode compatible
//
// Usage:
//   <div id="media-library-container"></div>
//   <script src="/static/js/media-library.js"></script>
//   <script>MediaLibrary.init('media-library-container');</script>
//
// =====================================================

(function () {
    'use strict';

    // ── Configuration ────────────────────────────────────

    var API_BASE = '/api/v1/media';
    var ITEMS_PER_PAGE = 24;
    var ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/ogg,application/pdf,text/plain';

    // ── State ───────────────────────────────────────────

    var state = {
        container: null,
        currentFolder: null,       // folder slug or null for "all"
        folders: [],               // folder tree from API
        mediaItems: [],            // current page of media items
        totalItems: 0,             // total count for pagination
        currentPage: 1,
        totalPages: 1,
        searchQuery: '',
        typeFilter: 'all',        // all, image, video, document
        sortBy: 'created_at',
        sortOrder: 'DESC',
        loading: false,
        selectedItems: new Set(),  // for bulk operations
        viewMode: 'grid',         // grid or list
    };

    // ── Utility functions ───────────────────────────────

    /**
     * Escapes HTML special characters in a string.
     * @param {string} str - The string to escape.
     * @returns {string} The escaped string.
     */
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Formats a file size in bytes to a human-readable string.
     * @param {number} bytes - The file size in bytes.
     * @returns {string} Formatted size (e.g., "1.5 MB").
     */
    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        if (i >= units.length) i = units.length - 1;
        return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
    }

    /**
     * Formats an ISO date string to a localized date.
     * @param {string} isoDate - The ISO date string.
     * @returns {string} Formatted date (e.g., "Jan 5, 2026").
     */
    function formatDate(isoDate) {
        if (!isoDate) return '';
        var d = new Date(isoDate);
        if (isNaN(d.getTime())) return isoDate;
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    /**
     * Shows a toast notification.
     * @param {string} message - The message.
     * @param {string} type - 'success', 'error', or 'info'.
     */
    function showToast(message, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        var el = document.createElement('div');
        el.textContent = message;
        el.className = 'ml-toast ml-toast-' + (type || 'info');
        document.body.appendChild(el);
        setTimeout(function () {
            el.classList.add('ml-toast-show');
        }, 10);
        setTimeout(function () {
            el.classList.remove('ml-toast-show');
            setTimeout(function () { el.remove(); }, 300);
        }, 3000);
    }

    /**
     * Gets the CSRF token from a meta tag.
     * @returns {string} The token or empty string.
     */
    function getCsrfToken() {
        var meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    /**
     * Detects dark mode.
     * @returns {boolean} True if dark mode is active.
     */
    function isDarkMode() {
        var body = document.body;
        var html = document.documentElement;
        if (body && body.classList.contains('dark')) return true;
        if (html && html.classList.contains('dark')) return true;
        if (html && html.getAttribute('data-theme') === 'dark') return true;
        return false;
    }

    /**
     * Gets the appropriate icon SVG for a media type.
     * @param {string} type - The media type (image, video, document).
     * @param {string} mimeType - The MIME type.
     * @returns {string} SVG HTML string.
     */
    function getTypeIcon(type, mimeType) {
        if (type === 'image') {
            return '<svg class="ml-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
        }
        if (type === 'video') {
            return '<svg class="ml-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>';
        }
        if (type === 'document' || (mimeType && mimeType.includes('pdf'))) {
            return '<svg class="ml-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>';
        }
        return '<svg class="ml-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
    }

    /**
     * Debounces a function call.
     * @param {Function} fn - The function to debounce.
     * @param {number} delay - The delay in milliseconds.
     * @returns {Function} The debounced function.
     */
    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var ctx = this;
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(ctx, args);
            }, delay);
        };
    }

    // ── API calls ────────────────────────────────────────

    /**
     * Fetches media items from the API with current state filters.
     * @returns {Promise<void>}
     */
    async function fetchMedia() {
        if (state.loading) return;
        state.loading = true;
        renderLoading();

        try {
            var params = new URLSearchParams();
            params.set('limit', ITEMS_PER_PAGE.toString());
            params.set('offset', ((state.currentPage - 1) * ITEMS_PER_PAGE).toString());
            params.set('sort', state.sortBy);
            params.set('order', state.sortOrder);

            if (state.typeFilter !== 'all') {
                params.set('type', state.typeFilter);
            }
            if (state.currentFolder) {
                params.set('folder', state.currentFolder);
            }

            var url = API_BASE + '/list?' + params.toString();

            var response = await fetch(url, { credentials: 'same-origin' });
            var data = await response.json();

            if (data.success) {
                state.mediaItems = data.items || [];
                state.totalItems = data.total || 0;
                state.totalPages = Math.max(1, Math.ceil(state.totalItems / ITEMS_PER_PAGE));
                if (state.currentPage > state.totalPages) {
                    state.currentPage = state.totalPages;
                }
            } else {
                state.mediaItems = [];
                state.totalItems = 0;
                state.totalPages = 1;
                showToast('Failed to load media: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            state.mediaItems = [];
            showToast('Failed to load media: ' + error.message, 'error');
        } finally {
            state.loading = false;
            render();
        }
    }

    /**
     * Fetches the folder tree from the API.
     * @returns {Promise<void>}
     */
    async function fetchFolders() {
        try {
            var response = await fetch(API_BASE + '/folders', { credentials: 'same-origin' });
            var data = await response.json();
            if (data.success) {
                state.folders = data.folders || [];
            }
        } catch (error) {
            console.error('Failed to load folders:', error);
        }
    }

    /**
     * Uploads files to R2 via the API.
     * @param {FileList|File[]} files - The files to upload.
     * @param {string} folder - The folder slug.
     * @returns {Promise<void>}
     */
    async function uploadFiles(files, folder) {
        var fileArr = Array.from(files);
        var successCount = 0;
        var errorCount = 0;

        for (var i = 0; i < fileArr.length; i++) {
            var file = fileArr[i];
            try {
                var formData = new FormData();
                formData.append('file', file);
                formData.append('folder', folder || state.currentFolder || 'general');

                // Get image dimensions
                if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
                    var dims = await getImageDimensions(file);
                    if (dims) {
                        formData.append('width', dims.width);
                        formData.append('height', dims.height);
                    }
                }

                var response = await fetch(API_BASE + '/upload', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'X-CSRF-Token': getCsrfToken() },
                    body: formData
                });

                var data = await response.json();
                if (data.success) {
                    successCount++;
                } else {
                    errorCount++;
                    showToast('Upload failed: ' + (data.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                errorCount++;
                showToast('Upload failed: ' + file.name + ': ' + error.message, 'error');
            }
        }

        if (successCount > 0) {
            showToast(successCount + ' file(s) uploaded successfully', 'success');
            await fetchMedia();
        }
        if (errorCount > 0 && successCount === 0) {
            showToast('All uploads failed', 'error');
        }
    }

    /**
     * Gets image dimensions from a File object.
     * @param {File} file - The image file.
     * @returns {Promise<{width: number, height: number}|null>}
     */
    function getImageDimensions(file) {
        return new Promise(function (resolve) {
            var url = URL.createObjectURL(file);
            var img = new Image();
            img.onload = function () {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
                URL.revokeObjectURL(url);
            };
            img.onerror = function () {
                resolve(null);
                URL.revokeObjectURL(url);
            };
            img.src = url;
        });
    }

    /**
     * Deletes a media item.
     * @param {number} id - The media item ID.
     * @returns {Promise<void>}
     */
    async function deleteMediaItem(id) {
        try {
            var response = await fetch(API_BASE + '/delete/' + id, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: { 'X-CSRF-Token': getCsrfToken() }
            });
            var data = await response.json();
            if (data.success) {
                showToast('Media deleted', 'success');
                await fetchMedia();
            } else {
                showToast('Delete failed: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            showToast('Delete failed: ' + error.message, 'error');
        }
    }

    /**
     * Updates media metadata.
     * @param {number} id - The media item ID.
     * @param {Object} data - The fields to update.
     * @returns {Promise<boolean>} True if successful.
     */
    async function updateMediaItem(id, data) {
        try {
            var response = await fetch(API_BASE + '/update/' + id, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCsrfToken()
                },
                body: JSON.stringify(data)
            });
            var result = await response.json();
            if (result.success) {
                showToast('Media updated', 'success');
                return true;
            } else {
                showToast('Update failed: ' + (result.error || 'Unknown error'), 'error');
                return false;
            }
        } catch (error) {
            showToast('Update failed: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Creates a new folder.
     * @param {string} name - The folder name.
     * @param {number|null} parentId - Parent folder ID.
     * @returns {Promise<boolean>} True if successful.
     */
    async function createFolder(name, parentId) {
        var slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (!slug) {
            showToast('Invalid folder name', 'error');
            return false;
        }
        try {
            var response = await fetch(API_BASE + '/folders', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCsrfToken()
                },
                body: JSON.stringify({ name: name, slug: slug, parent_id: parentId || null })
            });
            var data = await response.json();
            if (data.success) {
                showToast('Folder created', 'success');
                await fetchFolders();
                return true;
            } else {
                showToast('Create folder failed: ' + (data.error || 'Unknown error'), 'error');
                return false;
            }
        } catch (error) {
            showToast('Create folder failed: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Renames a folder.
     * @param {number} id - The folder ID.
     * @param {string} name - The new name.
     * @returns {Promise<boolean>} True if successful.
     */
    async function renameFolder(id, name) {
        var slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        try {
            var response = await fetch(API_BASE + '/folders/' + id, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCsrfToken()
                },
                body: JSON.stringify({ name: name, slug: slug })
            });
            var data = await response.json();
            if (data.success) {
                showToast('Folder renamed', 'success');
                await fetchFolders();
                return true;
            } else {
                showToast('Rename failed: ' + (data.error || 'Unknown error'), 'error');
                return false;
            }
        } catch (error) {
            showToast('Rename failed: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Deletes a folder.
     * @param {number} id - The folder ID.
     * @returns {Promise<boolean>} True if successful.
     */
    async function deleteFolder(id) {
        try {
            var response = await fetch(API_BASE + '/folders/' + id, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: { 'X-CSRF-Token': getCsrfToken() }
            });
            var data = await response.json();
            if (data.success) {
                showToast('Folder deleted', 'success');
                await fetchFolders();
                return true;
            } else {
                showToast('Delete failed: ' + (data.error || 'Unknown error'), 'error');
                return false;
            }
        } catch (error) {
            showToast('Delete failed: ' + error.message, 'error');
            return false;
        }
    }

    // ── Rendering ───────────────────────────────────────

    /**
     * Renders the full media library UI.
     */
    function render() {
        if (!state.container) return;
        var html = `
            <div class="ml-wrapper ${isDarkMode() ? 'ml-dark' : ''}">
                ${renderSidebar()}
                <div class="ml-main">
                    ${renderToolbar()}
                    ${renderDropzone()}
                    ${renderGrid()}
                    ${renderPagination()}
                </div>
            </div>
        `;
        state.container.innerHTML = html;
        attachEventListeners();
    }

    /**
     * Renders a loading state.
     */
    function renderLoading() {
        if (!state.container) return;
        var html = `
            <div class="ml-wrapper ${isDarkMode() ? 'ml-dark' : ''}">
                ${renderSidebar()}
                <div class="ml-main">
                    ${renderToolbar()}
                    <div class="ml-loading">
                        <div class="ml-spinner"></div>
                        <p>Loading media...</p>
                    </div>
                </div>
            </div>
        `;
        state.container.innerHTML = html;
        attachEventListeners();
    }

    /**
     * Renders the folder sidebar.
     * @returns {string} HTML string.
     */
    function renderSidebar() {
        var folderHtml = renderFolderTree(state.folders, 0);
        return `
            <aside class="ml-sidebar">
                <div class="ml-sidebar-header">
                    <h3 class="ml-sidebar-title">Folders</h3>
                    <button class="ml-btn ml-btn-icon ml-btn-small" id="ml-new-folder" title="New folder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                </div>
                <ul class="ml-folder-list">
                    <li class="ml-folder-item ${state.currentFolder === null ? 'active' : ''}" data-folder="">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        <span>All Media</span>
                        <span class="ml-folder-count">${state.totalItems}</span>
                    </li>
                    ${folderHtml}
                </ul>
            </aside>
        `;
    }

    /**
     * Recursively renders the folder tree.
     * @param {Array} folders - The folder tree.
     * @param {number} depth - The nesting depth.
     * @returns {string} HTML string.
     */
    function renderFolderTree(folders, depth) {
        var html = '';
        for (var i = 0; i < folders.length; i++) {
            var f = folders[i];
            var isActive = state.currentFolder === f.slug;
            var padding = 12 + depth * 16;
            html += `
                <li class="ml-folder-item ${isActive ? 'active' : ''}" data-folder="${escapeHtml(f.slug)}" data-folder-id="${f.id}" style="padding-left:${padding}px">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <span class="ml-folder-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
                    <div class="ml-folder-actions">
                        <button class="ml-btn ml-btn-icon ml-btn-tiny ml-folder-rename" data-folder-id="${f.id}" title="Rename">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="ml-btn ml-btn-icon ml-btn-tiny ml-folder-delete" data-folder-id="${f.id}" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </li>
            `;
            if (f.children && f.children.length > 0) {
                html += renderFolderTree(f.children, depth + 1);
            }
        }
        return html;
    }

    /**
     * Renders the toolbar (search, filter, sort, view toggle).
     * @returns {string} HTML string.
     */
    function renderToolbar() {
        var folderName = state.currentFolder
            ? getFolderName(state.currentFolder)
            : 'All Media';

        return `
            <div class="ml-toolbar">
                <div class="ml-toolbar-left">
                    <h2 class="ml-page-title">${escapeHtml(folderName)}</h2>
                </div>
                <div class="ml-toolbar-right">
                    <div class="ml-search-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" id="ml-search" placeholder="Search media..." value="${escapeHtml(state.searchQuery)}" />
                    </div>
                    <select id="ml-type-filter" class="ml-select">
                        <option value="all" ${state.typeFilter === 'all' ? 'selected' : ''}>All Types</option>
                        <option value="image" ${state.typeFilter === 'image' ? 'selected' : ''}>Images</option>
                        <option value="video" ${state.typeFilter === 'video' ? 'selected' : ''}>Videos</option>
                        <option value="document" ${state.typeFilter === 'document' ? 'selected' : ''}>Documents</option>
                    </select>
                    <select id="ml-sort" class="ml-select">
                        <option value="created_at-DESC" ${state.sortBy === 'created_at' && state.sortOrder === 'DESC' ? 'selected' : ''}>Newest First</option>
                        <option value="created_at-ASC" ${state.sortBy === 'created_at' && state.sortOrder === 'ASC' ? 'selected' : ''}>Oldest First</option>
                        <option value="filename-ASC" ${state.sortBy === 'filename' && state.sortOrder === 'ASC' ? 'selected' : ''}>Name A-Z</option>
                        <option value="filename-DESC" ${state.sortBy === 'filename' && state.sortOrder === 'DESC' ? 'selected' : ''}>Name Z-A</option>
                        <option value="size-DESC" ${state.sortBy === 'size' && state.sortOrder === 'DESC' ? 'selected' : ''}>Largest First</option>
                        <option value="size-ASC" ${state.sortBy === 'size' && state.sortOrder === 'ASC' ? 'selected' : ''}>Smallest First</option>
                    </select>
                    <button class="ml-btn ml-btn-primary" id="ml-upload-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Upload
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renders the drag-and-drop upload zone.
     * @returns {string} HTML string.
     */
    function renderDropzone() {
        return `
            <div class="ml-dropzone" id="ml-dropzone">
                <div class="ml-dropzone-inner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <p class="ml-dropzone-text">Drag and drop files here, or click to browse</p>
                    <p class="ml-dropzone-hint">JPEG, PNG, WebP, SVG, GIF, MP4, WebM, PDF — Max 10MB (images), 100MB (videos)</p>
                </div>
                <input type="file" id="ml-file-input" multiple accept="${ACCEPTED_TYPES}" style="display:none" />
            </div>
        `;
    }

    /**
     * Renders the media grid.
     * @returns {string} HTML string.
     */
    function renderGrid() {
        if (state.mediaItems.length === 0) {
            return `
                <div class="ml-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    <p>No media found</p>
                    <p class="ml-empty-hint">Upload files to get started</p>
                </div>
            `;
        }

        var items = state.mediaItems;
        var html = '<div class="ml-grid">';

        for (var i = 0; i < items.length; i++) {
            html += renderMediaCard(items[i]);
        }

        html += '</div>';
        return html;
    }

    /**
     * Renders a single media card.
     * @param {Object} item - The media item.
     * @returns {string} HTML string.
     */
    function renderMediaCard(item) {
        var thumb = '';
        if (item.type === 'image' && item.thumbnail_url) {
            thumb = '<img src="' + escapeHtml(item.thumbnail_url) + '" alt="' + escapeHtml(item.alt_text || item.filename) + '" loading="lazy" />';
        } else if (item.type === 'image' && item.url) {
            thumb = '<img src="' + escapeHtml(item.url) + '" alt="' + escapeHtml(item.alt_text || item.filename) + '" loading="lazy" />';
        } else if (item.type === 'video' && item.poster_url) {
            thumb = '<img src="' + escapeHtml(item.poster_url) + '" alt="' + escapeHtml(item.filename) + '" loading="lazy" />';
            thumb += '<div class="ml-play-overlay"><svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>';
        } else {
            thumb = '<div class="ml-thumb-placeholder">' + getTypeIcon(item.type, item.mime_type) + '</div>';
            if (item.type === 'video') {
                thumb += '<div class="ml-play-overlay"><svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>';
            }
        }

        return `
            <div class="ml-card" data-media-id="${item.id}">
                <div class="ml-card-thumb">
                    ${thumb}
                    <div class="ml-card-overlay">
                        <button class="ml-btn ml-btn-icon ml-btn-overlay ml-card-copy" data-url="${escapeHtml(item.url)}" title="Copy URL">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button class="ml-btn ml-btn-icon ml-btn-overlay ml-card-edit" data-media-id="${item.id}" title="Edit details">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="ml-btn ml-btn-icon ml-btn-overlay ml-card-delete" data-media-id="${item.id}" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
                <div class="ml-card-info">
                    <p class="ml-card-name" title="${escapeHtml(item.original_filename || item.filename)}">${escapeHtml(item.original_filename || item.filename)}</p>
                    <p class="ml-card-meta">${escapeHtml(formatFileSize(item.size))} · ${escapeHtml(formatDate(item.created_at))}</p>
                </div>
            </div>
        `;
    }

    /**
     * Renders the pagination controls.
     * @returns {string} HTML string.
     */
    function renderPagination() {
        if (state.totalPages <= 1) return '';

        var currentPage = state.currentPage;
        var totalPages = state.totalPages;
        var html = '<div class="ml-pagination">';

        // Previous button
        html += `<button class="ml-btn ml-btn-page ${currentPage === 1 ? 'disabled' : ''}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>`;

        // Page numbers (show up to 7 pages with ellipsis)
        var startPage = Math.max(1, currentPage - 3);
        var endPage = Math.min(totalPages, currentPage + 3);

        if (startPage > 1) {
            html += `<button class="ml-btn ml-btn-page" data-page="1">1</button>`;
            if (startPage > 2) {
                html += '<span class="ml-pagination-ellipsis">...</span>';
            }
        }

        for (var p = startPage; p <= endPage; p++) {
            html += `<button class="ml-btn ml-btn-page ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += '<span class="ml-pagination-ellipsis">...</span>';
            }
            html += `<button class="ml-btn ml-btn-page" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        html += `<button class="ml-btn ml-btn-page ${currentPage === totalPages ? 'disabled' : ''}" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;

        html += '</div>';
        return html;
    }

    /**
     * Gets a folder's display name from its slug.
     * @param {string} slug - The folder slug.
     * @returns {string} The folder name.
     */
    function getFolderName(slug) {
        function findInTree(folders) {
            for (var i = 0; i < folders.length; i++) {
                if (folders[i].slug === slug) return folders[i].name;
                if (folders[i].children) {
                    var found = findInTree(folders[i].children);
                    if (found) return found;
                }
            }
            return null;
        }
        return findInTree(state.folders) || slug;
    }

    // ── Edit modal ──────────────────────────────────────

    /**
     * Opens the edit modal for a media item.
     * @param {number} mediaId - The media item ID.
     */
    function openEditModal(mediaId) {
        var item = state.mediaItems.find(function (m) { return m.id === mediaId; });
        if (!item) return;

        var modal = document.createElement('div');
        modal.className = 'ml-modal-overlay';
        modal.innerHTML = `
            <div class="ml-modal">
                <div class="ml-modal-header">
                    <h3>Edit Media Details</h3>
                    <button class="ml-btn ml-btn-icon ml-modal-close" title="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="ml-modal-body">
                    <div class="ml-modal-preview">
                        ${item.type === 'image'
                            ? '<img src="' + escapeHtml(item.url) + '" alt="' + escapeHtml(item.alt_text || '') + '" style="max-width:100%;max-height:300px;border-radius:8px;" />'
                            : '<div class="ml-thumb-placeholder" style="height:200px;">' + getTypeIcon(item.type, item.mime_type) + '</div>'
                        }
                    </div>
                    <div class="ml-modal-form">
                        <div class="ml-form-group">
                            <label>Filename</label>
                            <input type="text" id="ml-edit-filename" value="${escapeHtml(item.original_filename || item.filename)}" readonly />
                        </div>
                        <div class="ml-form-group">
                            <label>Alt Text</label>
                            <input type="text" id="ml-edit-alt" value="${escapeHtml(item.alt_text || '')}" placeholder="Describe the image for accessibility" />
                        </div>
                        <div class="ml-form-group">
                            <label>Caption</label>
                            <input type="text" id="ml-edit-caption" value="${escapeHtml(item.caption || '')}" placeholder="Caption displayed below the image" />
                        </div>
                        <div class="ml-form-group">
                            <label>Folder</label>
                            <select id="ml-edit-folder">
                                ${renderFolderOptions(state.folders, item.folder)}
                            </select>
                        </div>
                        <div class="ml-form-group">
                            <label>URL</label>
                            <div class="ml-url-row">
                                <input type="text" id="ml-edit-url" value="${escapeHtml(item.url)}" readonly />
                                <button class="ml-btn ml-btn-secondary" id="ml-copy-url-btn">Copy</button>
                            </div>
                        </div>
                        <div class="ml-form-group ml-form-row">
                            <div>
                                <label>Type</label>
                                <input type="text" value="${escapeHtml(item.type || 'image')}" readonly />
                            </div>
                            <div>
                                <label>Size</label>
                                <input type="text" value="${escapeHtml(formatFileSize(item.size))}" readonly />
                            </div>
                            <div>
                                <label>Dimensions</label>
                                <input type="text" value="${item.width && item.height ? item.width + ' × ' + item.height : 'N/A'}" readonly />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ml-modal-footer">
                    <button class="ml-btn ml-btn-danger" id="ml-edit-delete">Delete</button>
                    <div class="ml-modal-footer-right">
                        <button class="ml-btn ml-btn-secondary ml-modal-close">Cancel</button>
                        <button class="ml-btn ml-btn-primary" id="ml-edit-save">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close handlers
        modal.querySelectorAll('.ml-modal-close').forEach(function (btn) {
            btn.addEventListener('click', function () { modal.remove(); });
        });
        modal.addEventListener('click', function (e) {
            if (e.target === modal) modal.remove();
        });

        // Copy URL
        var copyBtn = modal.querySelector('#ml-copy-url-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                var urlInput = modal.querySelector('#ml-edit-url');
                urlInput.select();
                document.execCommand('copy');
                showToast('URL copied to clipboard', 'success');
            });
        }

        // Save
        var saveBtn = modal.querySelector('#ml-edit-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', async function () {
                var altText = modal.querySelector('#ml-edit-alt').value;
                var caption = modal.querySelector('#ml-edit-caption').value;
                var folder = modal.querySelector('#ml-edit-folder').value;
                var updated = await updateMediaItem(mediaId, {
                    alt_text: altText,
                    caption: caption,
                    folder: folder
                });
                if (updated) {
                    modal.remove();
                    await fetchMedia();
                }
            });
        }

        // Delete
        var deleteBtn = modal.querySelector('#ml-edit-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async function () {
                if (!confirm('Are you sure you want to delete this media item? This cannot be undone.')) return;
                await deleteMediaItem(mediaId);
                modal.remove();
            });
        }
    }

    /**
     * Renders folder options for a select element.
     * @param {Array} folders - The folder tree.
     * @param {string} selected - The currently selected folder slug.
     * @param {number} depth - The nesting depth.
     * @returns {string} HTML string.
     */
    function renderFolderOptions(folders, selected, depth) {
        depth = depth || 0;
        var html = '';
        for (var i = 0; i < folders.length; i++) {
            var f = folders[i];
            var prefix = depth > 0 ? '— '.repeat(depth) : '';
            html += '<option value="' + escapeHtml(f.slug) + '"' + (f.slug === selected ? ' selected' : '') + '>' + prefix + escapeHtml(f.name) + '</option>';
            if (f.children && f.children.length > 0) {
                html += renderFolderOptions(f.children, selected, depth + 1);
            }
        }
        return html;
    }

    // ── New folder modal ───────────────────────────────

    /**
     * Opens a dialog to create a new folder.
     */
    function openNewFolderDialog() {
        var name = prompt('Enter folder name:');
        if (name && name.trim()) {
            createFolder(name.trim(), null);
        }
    }

    /**
     * Opens a dialog to rename a folder.
     * @param {number} folderId - The folder ID.
     */
    function openRenameFolderDialog(folderId) {
        var folder = findFolderById(state.folders, folderId);
        var name = prompt('Enter new folder name:', folder ? folder.name : '');
        if (name && name.trim()) {
            renameFolder(folderId, name.trim());
        }
    }

    /**
     * Finds a folder by ID in the tree.
     * @param {Array} folders - The folder tree.
     * @param {number} id - The folder ID.
     * @returns {Object|null} The folder or null.
     */
    function findFolderById(folders, id) {
        for (var i = 0; i < folders.length; i++) {
            if (folders[i].id === id) return folders[i];
            if (folders[i].children) {
                var found = findFolderById(folders[i].children, id);
                if (found) return found;
            }
        }
        return null;
    }

    // ── Event listeners ─────────────────────────────────

    /**
     * Attaches all event listeners to the rendered UI.
     */
    function attachEventListeners() {
        // Folder navigation
        var folderItems = state.container.querySelectorAll('.ml-folder-item');
        folderItems.forEach(function (item) {
            item.addEventListener('click', function (e) {
                // Don't navigate if clicking action buttons
                if (e.target.closest('.ml-folder-actions')) return;
                var folder = item.getAttribute('data-folder');
                state.currentFolder = folder || null;
                state.currentPage = 1;
                fetchMedia();
            });
        });

        // Folder rename
        state.container.querySelectorAll('.ml-folder-rename').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var folderId = parseInt(btn.getAttribute('data-folder-id'), 10);
                openRenameFolderDialog(folderId);
            });
        });

        // Folder delete
        state.container.querySelectorAll('.ml-folder-delete').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var folderId = parseInt(btn.getAttribute('data-folder-id'), 10);
                if (confirm('Delete this folder? Media items will be moved to "General".')) {
                    deleteFolder(folderId);
                }
            });
        });

        // New folder button
        var newFolderBtn = state.container.querySelector('#ml-new-folder');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', openNewFolderDialog);
        }

        // Search
        var searchInput = state.container.querySelector('#ml-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(function () {
                state.searchQuery = searchInput.value;
                state.currentPage = 1;
                if (state.searchQuery.trim()) {
                    searchMedia();
                } else {
                    fetchMedia();
                }
            }, 300));
        }

        // Type filter
        var typeFilter = state.container.querySelector('#ml-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', function () {
                state.typeFilter = typeFilter.value;
                state.currentPage = 1;
                fetchMedia();
            });
        }

        // Sort
        var sortSelect = state.container.querySelector('#ml-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', function () {
                var parts = sortSelect.value.split('-');
                state.sortBy = parts[0];
                state.sortOrder = parts[1] || 'DESC';
                fetchMedia();
            });
        }

        // Upload button
        var uploadBtn = state.container.querySelector('#ml-upload-btn');
        var fileInput = state.container.querySelector('#ml-file-input');
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', function () {
                fileInput.click();
            });
            fileInput.addEventListener('change', function () {
                if (fileInput.files.length > 0) {
                    uploadFiles(fileInput.files, state.currentFolder || 'general');
                    fileInput.value = '';
                }
            });
        }

        // Dropzone
        var dropzone = state.container.querySelector('#ml-dropzone');
        if (dropzone) {
            dropzone.addEventListener('click', function () {
                fileInput.click();
            });
            dropzone.addEventListener('dragover', function (e) {
                e.preventDefault();
                dropzone.classList.add('ml-dropzone-active');
            });
            dropzone.addEventListener('dragleave', function () {
                dropzone.classList.remove('ml-dropzone-active');
            });
            dropzone.addEventListener('drop', function (e) {
                e.preventDefault();
                dropzone.classList.remove('ml-dropzone-active');
                if (e.dataTransfer.files.length > 0) {
                    uploadFiles(e.dataTransfer.files, state.currentFolder || 'general');
                }
            });
        }

        // Media card actions
        state.container.querySelectorAll('.ml-card-copy').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var url = btn.getAttribute('data-url');
                copyToClipboard(url);
            });
        });

        state.container.querySelectorAll('.ml-card-edit').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var mediaId = parseInt(btn.getAttribute('data-media-id'), 10);
                openEditModal(mediaId);
            });
        });

        state.container.querySelectorAll('.ml-card-delete').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var mediaId = parseInt(btn.getAttribute('data-media-id'), 10);
                if (confirm('Are you sure you want to delete this media item? This cannot be undone.')) {
                    deleteMediaItem(mediaId);
                }
            });
        });

        // Pagination
        state.container.querySelectorAll('.ml-btn-page').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.classList.contains('disabled') || btn.disabled) return;
                var page = parseInt(btn.getAttribute('data-page'), 10);
                if (page >= 1 && page <= state.totalPages) {
                    state.currentPage = page;
                    fetchMedia();
                }
            });
        });
    }

    /**
     * Searches media items.
     */
    async function searchMedia() {
        if (state.loading) return;
        state.loading = true;
        renderLoading();

        try {
            var params = new URLSearchParams();
            params.set('q', state.searchQuery);
            params.set('limit', ITEMS_PER_PAGE.toString());
            params.set('offset', ((state.currentPage - 1) * ITEMS_PER_PAGE).toString());

            var response = await fetch(API_BASE + '/search?' + params.toString(), { credentials: 'same-origin' });
            var data = await response.json();

            if (data.success) {
                state.mediaItems = data.results || [];
                state.totalItems = state.mediaItems.length;
                state.totalPages = 1;
            } else {
                state.mediaItems = [];
                showToast('Search failed: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            state.mediaItems = [];
            showToast('Search failed: ' + error.message, 'error');
        } finally {
            state.loading = false;
            render();
        }
    }

    /**
     * Copies text to clipboard.
     * @param {string} text - The text to copy.
     */
    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast('URL copied to clipboard', 'success');
            }).catch(function () {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    /**
     * Fallback clipboard copy for older browsers.
     * @param {string} text - The text to copy.
     */
    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('URL copied to clipboard', 'success');
        } catch (e) {
            showToast('Failed to copy URL', 'error');
        }
        textarea.remove();
    }

    // ── Public API ──────────────────────────────────────

    /**
     * Initializes the media library in a container.
     * @param {string|HTMLElement} container - The container element or selector.
     */
    async function init(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        if (!container) {
            console.error('MediaLibrary.init: container not found');
            return;
        }
        state.container = container;
        await fetchFolders();
        await fetchMedia();
    }

    /**
     * Refreshes the media library (re-fetches data).
     */
    async function refresh() {
        await fetchFolders();
        await fetchMedia();
    }

    // ── Expose global API ───────────────────────────────

    window.MediaLibrary = {
        init: init,
        refresh: refresh,
    };

})();

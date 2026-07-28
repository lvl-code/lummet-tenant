// =====================================================
// media-picker.js — Modal Media Picker for TinyMCE
// =====================================================
//
// Provides a modal media picker that integrates with the
// TinyMCE rich editor (Phase 4). The picker lets editors:
//   1. Browse and search existing media from the library
//   2. Upload new media directly from the picker
//   3. Select a media item to insert into the editor
//
// Exposes:
//   window.MediaPicker.openImagePicker(callback, folder)
//   window.MediaPicker.openVideoPicker(callback, folder)
//   window.MediaPicker.close()
//
// The callback receives a media object:
//   { id, url, thumbnail_url, alt_text, caption, type,
//     mime_type, size, width, height, folder, filename }
//
// =====================================================

(function () {
    'use strict';

    // ── Configuration ────────────────────────────────────

    var API_BASE = '/api/v1/media';
    var PICKER_PAGE_SIZE = 24;
    var ACCEPTED_IMAGE = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml';
    var ACCEPTED_VIDEO = 'video/mp4,video/webm,video/ogg';

    // ── State ───────────────────────────────────────────

    var pickerState = {
        modal: null,
        callback: null,
        mediaType: 'image',     // 'image' or 'video'
        folder: 'general',
        items: [],
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        searchQuery: '',
        loading: false,
        activeTab: 'library',   // 'library' or 'upload'
    };

    // ── Utility functions ───────────────────────────────

    /**
     * Escapes HTML special characters.
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
     * Formats file size.
     * @param {number} bytes - File size in bytes.
     * @returns {string} Formatted size.
     */
    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        if (i >= units.length) i = units.length - 1;
        return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
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
        setTimeout(function () { el.classList.add('ml-toast-show'); }, 10);
        setTimeout(function () {
            el.classList.remove('ml-toast-show');
            setTimeout(function () { el.remove(); }, 300);
        }, 3000);
    }

    /**
     * Gets the CSRF token.
     * @returns {string} The token.
     */
    function getCsrfToken() {
        var meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    /**
     * Gets image dimensions from a File.
     * @param {File} file - The image file.
     * @returns {Promise<{width: number, height: number}|null>}
     */
    function getImageDimensions(file) {
        return new Promise(function (resolve) {
            if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
                resolve(null);
                return;
            }
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
     * Debounces a function.
     * @param {Function} fn - The function.
     * @param {number} delay - The delay in ms.
     * @returns {Function} The debounced function.
     */
    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
        };
    }

    // ── API calls ────────────────────────────────────────

    /**
     * Fetches media items for the picker.
     * @returns {Promise<void>}
     */
    async function fetchPickerMedia() {
        if (pickerState.loading) return;
        pickerState.loading = true;
        renderPickerBody();

        try {
            var params = new URLSearchParams();
            params.set('type', pickerState.mediaType);
            params.set('limit', PICKER_PAGE_SIZE.toString());
            params.set('offset', ((pickerState.currentPage - 1) * PICKER_PAGE_SIZE).toString());
            params.set('sort', 'created_at');
            params.set('order', 'DESC');

            var url;
            if (pickerState.searchQuery.trim()) {
                params.set('q', pickerState.searchQuery.trim());
                url = API_BASE + '/search?' + params.toString();
            } else {
                url = API_BASE + '/list?' + params.toString();
            }

            var response = await fetch(url, { credentials: 'same-origin' });
            var data = await response.json();

            if (data.success) {
                pickerState.items = data.items || data.results || [];
                pickerState.totalItems = data.total || pickerState.items.length;
                pickerState.totalPages = Math.max(1, Math.ceil(pickerState.totalItems / PICKER_PAGE_SIZE));
            } else {
                pickerState.items = [];
                pickerState.totalItems = 0;
                pickerState.totalPages = 1;
            }
        } catch (error) {
            pickerState.items = [];
            showToast('Failed to load media: ' + error.message, 'error');
        } finally {
            pickerState.loading = false;
            renderPickerBody();
        }
    }

    /**
     * Uploads a file from within the picker.
     * @param {File} file - The file to upload.
     * @returns {Promise<Object|null>} The uploaded media object or null.
     */
    async function uploadFromPicker(file) {
        try {
            var formData = new FormData();
            formData.append('file', file);
            formData.append('folder', pickerState.folder || 'general');

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
                showToast('File uploaded successfully', 'success');
                return data.media;
            } else {
                showToast('Upload failed: ' + (data.error || 'Unknown error'), 'error');
                return null;
            }
        } catch (error) {
            showToast('Upload failed: ' + error.message, 'error');
            return null;
        }
    }

    // ── Rendering ───────────────────────────────────────

    /**
     * Opens the media picker modal.
     * @param {Function} callback - Called with the selected media object.
     * @param {string} folder - The default folder slug.
     * @param {string} mediaType - 'image' or 'video'.
     */
    function openPicker(callback, folder, mediaType) {
        pickerState.callback = callback;
        pickerState.folder = folder || 'general';
        pickerState.mediaType = mediaType || 'image';
        pickerState.currentPage = 1;
        pickerState.searchQuery = '';
        pickerState.activeTab = 'library';
        pickerState.items = [];

        // Remove any existing picker modal
        close();

        // Create modal
        var modal = document.createElement('div');
        modal.className = 'ml-modal-overlay ml-picker-overlay';
        modal.innerHTML = `
            <div class="ml-modal ml-picker-modal">
                <div class="ml-modal-header">
                    <h3>${mediaType === 'video' ? 'Select Video' : 'Select Image'}</h3>
                    <button class="ml-btn ml-btn-icon ml-modal-close" title="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="ml-picker-tabs">
                    <button class="ml-tab ${pickerState.activeTab === 'library' ? 'active' : ''}" data-tab="library">Media Library</button>
                    <button class="ml-tab ${pickerState.activeTab === 'upload' ? 'active' : ''}" data-tab="upload">Upload New</button>
                </div>
                <div class="ml-modal-body" id="ml-picker-body"></div>
            </div>
        `;
        document.body.appendChild(modal);
        pickerState.modal = modal;

        // Close handlers
        modal.querySelectorAll('.ml-modal-close').forEach(function (btn) {
            btn.addEventListener('click', close);
        });
        modal.addEventListener('click', function (e) {
            if (e.target === modal) close();
        });

        // Tab switching
        modal.querySelectorAll('.ml-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                pickerState.activeTab = tab.getAttribute('data-tab');
                modal.querySelectorAll('.ml-tab').forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                renderPickerBody();
            });
        });

        // Load media
        fetchPickerMedia();
    }

    /**
     * Renders the picker body based on active tab.
     */
    function renderPickerBody() {
        var body = pickerState.modal.querySelector('#ml-picker-body');
        if (!body) return;

        if (pickerState.activeTab === 'library') {
            body.innerHTML = renderLibraryTab();
            attachLibraryTabListeners(body);
        } else {
            body.innerHTML = renderUploadTab();
            attachUploadTabListeners(body);
        }
    }

    /**
     * Renders the library tab content.
     * @returns {string} HTML string.
     */
    function renderLibraryTab() {
        var searchHtml = `
            <div class="ml-picker-search">
                <input type="text" id="ml-picker-search-input" placeholder="Search media..." value="${escapeHtml(pickerState.searchQuery)}" />
            </div>
        `;

        if (pickerState.loading) {
            return searchHtml + `
                <div class="ml-loading">
                    <div class="ml-spinner"></div>
                    <p>Loading media...</p>
                </div>
            `;
        }

        if (pickerState.items.length === 0) {
            return searchHtml + `
                <div class="ml-empty">
                    <p>No media found</p>
                    <p class="ml-empty-hint">Try uploading a new file</p>
                </div>
            `;
        }

        var gridHtml = '<div class="ml-picker-grid">';
        for (var i = 0; i < pickerState.items.length; i++) {
            gridHtml += renderPickerCard(pickerState.items[i]);
        }
        gridHtml += '</div>';

        // Pagination
        var paginationHtml = '';
        if (pickerState.totalPages > 1) {
            paginationHtml = '<div class="ml-picker-pagination">';
            if (pickerState.currentPage > 1) {
                paginationHtml += '<button class="ml-btn ml-btn-page" data-page="' + (pickerState.currentPage - 1) + '">Previous</button>';
            }
            paginationHtml += '<span class="ml-page-info">Page ' + pickerState.currentPage + ' of ' + pickerState.totalPages + '</span>';
            if (pickerState.currentPage < pickerState.totalPages) {
                paginationHtml += '<button class="ml-btn ml-btn-page" data-page="' + (pickerState.currentPage + 1) + '">Next</button>';
            }
            paginationHtml += '</div>';
        }

        return searchHtml + gridHtml + paginationHtml;
    }

    /**
     * Renders a media card for the picker.
     * @param {Object} item - The media item.
     * @returns {string} HTML string.
     */
    function renderPickerCard(item) {
        var thumb = '';
        if (item.type === 'image' && (item.thumbnail_url || item.url)) {
            thumb = '<img src="' + escapeHtml(item.thumbnail_url || item.url) + '" alt="' + escapeHtml(item.alt_text || item.filename) + '" loading="lazy" />';
        } else if (item.type === 'video' && item.poster_url) {
            thumb = '<img src="' + escapeHtml(item.poster_url) + '" alt="' + escapeHtml(item.filename) + '" loading="lazy" />';
        } else {
            thumb = '<div class="ml-thumb-placeholder-small">' + escapeHtml(item.type || 'file') + '</div>';
        }

        return `
            <div class="ml-picker-card" data-media-id="${item.id}">
                <div class="ml-picker-card-thumb">${thumb}</div>
                <p class="ml-picker-card-name" title="${escapeHtml(item.original_filename || item.filename)}">${escapeHtml(item.original_filename || item.filename)}</p>
                <p class="ml-picker-card-meta">${escapeHtml(formatFileSize(item.size))}</p>
            </div>
        `;
    }

    /**
     * Renders the upload tab content.
     * @returns {string} HTML string.
     */
    function renderUploadTab() {
        var accept = pickerState.mediaType === 'video' ? ACCEPTED_VIDEO : ACCEPTED_IMAGE;
        var label = pickerState.mediaType === 'video' ? 'video' : 'image';

        return `
            <div class="ml-picker-upload">
                <div class="ml-dropzone" id="ml-picker-dropzone">
                    <div class="ml-dropzone-inner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <p class="ml-dropzone-text">Drag and drop a ${label} here, or click to browse</p>
                        <p class="ml-dropzone-hint">Max ${pickerState.mediaType === 'video' ? '100MB' : '10MB'}</p>
                    </div>
                    <input type="file" id="ml-picker-file-input" accept="${accept}" style="display:none" />
                </div>
                <div id="ml-picker-upload-progress"></div>
            </div>
        `;
    }

    // ── Event listeners ─────────────────────────────────

    /**
     * Attaches event listeners for the library tab.
     * @param {HTMLElement} body - The modal body element.
     */
    function attachLibraryTabListeners(body) {
        // Search
        var searchInput = body.querySelector('#ml-picker-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(function () {
                pickerState.searchQuery = searchInput.value;
                pickerState.currentPage = 1;
                fetchPickerMedia();
            }, 300));
        }

        // Card selection
        body.querySelectorAll('.ml-picker-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var mediaId = parseInt(card.getAttribute('data-media-id'), 10);
                var item = pickerState.items.find(function (m) { return m.id === mediaId; });
                if (item && pickerState.callback) {
                    pickerState.callback(item);
                }
                close();
            });
        });

        // Pagination
        body.querySelectorAll('.ml-btn-page').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var page = parseInt(btn.getAttribute('data-page'), 10);
                if (page >= 1 && page <= pickerState.totalPages) {
                    pickerState.currentPage = page;
                    fetchPickerMedia();
                }
            });
        });
    }

    /**
     * Attaches event listeners for the upload tab.
     * @param {HTMLElement} body - The modal body element.
     */
    function attachUploadTabListeners(body) {
        var dropzone = body.querySelector('#ml-picker-dropzone');
        var fileInput = body.querySelector('#ml-picker-file-input');

        if (!dropzone || !fileInput) return;

        // Click to browse
        dropzone.addEventListener('click', function () {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', async function () {
            if (fileInput.files.length > 0) {
                var progress = body.querySelector('#ml-picker-upload-progress');
                if (progress) {
                    progress.innerHTML = '<div class="ml-loading"><div class="ml-spinner"></div><p>Uploading...</p></div>';
                }
                var media = await uploadFromPicker(fileInput.files[0]);
                if (media && pickerState.callback) {
                    pickerState.callback(media);
                    close();
                } else if (media) {
                    // No callback — switch to library tab to show the new upload
                    pickerState.activeTab = 'library';
                    fetchPickerMedia();
                } else if (progress) {
                    progress.innerHTML = '';
                }
            }
        });

        // Drag and drop
        dropzone.addEventListener('dragover', function (e) {
            e.preventDefault();
            dropzone.classList.add('ml-dropzone-active');
        });
        dropzone.addEventListener('dragleave', function () {
            dropzone.classList.remove('ml-dropzone-active');
        });
        dropzone.addEventListener('drop', async function (e) {
            e.preventDefault();
            dropzone.classList.remove('ml-dropzone-active');
            if (e.dataTransfer.files.length > 0) {
                var progress = body.querySelector('#ml-picker-upload-progress');
                if (progress) {
                    progress.innerHTML = '<div class="ml-loading"><div class="ml-spinner"></div><p>Uploading...</p></div>';
                }
                var media = await uploadFromPicker(e.dataTransfer.files[0]);
                if (media && pickerState.callback) {
                    pickerState.callback(media);
                    close();
                } else if (media) {
                    pickerState.activeTab = 'library';
                    fetchPickerMedia();
                } else if (progress) {
                    progress.innerHTML = '';
                }
            }
        });
    }

    // ── Close ───────────────────────────────────────────

    /**
     * Closes the picker modal.
     */
    function close() {
        if (pickerState.modal) {
            pickerState.modal.remove();
            pickerState.modal = null;
        }
        pickerState.callback = null;
    }

    // ── Public API ──────────────────────────────────────

    window.MediaPicker = {
        /**
         * Opens the image picker modal.
         * @param {Function} callback - Called with the selected media object.
         * @param {string} folder - The default folder slug.
         */
        openImagePicker: function (callback, folder) {
            openPicker(callback, folder, 'image');
        },

        /**
         * Opens the video picker modal.
         * @param {Function} callback - Called with the selected media object.
         * @param {string} folder - The default folder slug.
         */
        openVideoPicker: function (callback, folder) {
            openPicker(callback, folder, 'video');
        },

        /**
         * Closes the picker modal.
         */
        close: close,
    };

})();

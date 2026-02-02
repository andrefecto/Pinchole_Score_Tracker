const CloudSave = {
  CLIENT_ID: '1002374937041-qr020arv6epaha0vt8pf3cm2gm12f7nd.apps.googleusercontent.com',
  SCOPES: 'https://www.googleapis.com/auth/drive.file',
  APP_TAG: 'pinochle-scorer',

  tokenClient: null,
  accessToken: null,
  userEmail: null,
  _pendingAction: null,
  _statusTimeout: null,

  init() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      return;
    }

    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      callback: (resp) => this._onTokenReceived(resp),
    });

    document.getElementById('cloud-save-section').classList.remove('hidden');
    this.bindEvents();
  },

  signIn() {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken();
    }
  },

  _onTokenReceived(resp) {
    if (resp.error) {
      this._showStatus('Sign-in failed: ' + resp.error);
      return;
    }

    this.accessToken = resp.access_token;

    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + this.accessToken },
    })
      .then(r => r.json())
      .then(info => {
        this.userEmail = info.email || 'Signed in';
        this._updateUI(true);

        if (this._pendingAction) {
          const action = this._pendingAction;
          this._pendingAction = null;
          action();
        }
      })
      .catch(() => {
        this.userEmail = 'Signed in';
        this._updateUI(true);
      });
  },

  signOut() {
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
    this.accessToken = null;
    this.userEmail = null;
    this._pendingAction = null;
    this._updateUI(false);
    this._showStatus('Signed out');
  },

  _driveRequest(url, options) {
    if (!options) options = {};
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = 'Bearer ' + this.accessToken;

    return fetch(url, options).then(resp => {
      if (resp.status === 401) {
        this.accessToken = null;
        return new Promise(resolve => {
          this._pendingAction = () => {
            this._driveRequest(url, options).then(resolve);
          };
          this.signIn();
        });
      }
      return resp;
    });
  },

  saveGame() {
    const json = GameState.exportJSON();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const filename = 'pinochle-' +
      now.getFullYear() + '-' +
      pad(now.getMonth() + 1) + '-' +
      pad(now.getDate()) + '-' +
      pad(now.getHours()) + 'h' +
      pad(now.getMinutes()) + '.json';

    const metadata = {
      name: filename,
      mimeType: 'application/json',
      appProperties: { app: this.APP_TAG },
    };

    const boundary = '-------CloudSaveBoundary';
    const body =
      '--' + boundary + '\r\n' +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Type: application/json\r\n\r\n' +
      json + '\r\n' +
      '--' + boundary + '--';

    this._showStatus('Saving...');

    this._driveRequest(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
        body: body,
      }
    ).then(resp => {
      if (resp && resp.ok) {
        this._showStatus('Saved!');
      } else {
        this._showStatus('Save failed.');
      }
    }).catch(() => {
      this._showStatus('Save failed.');
    });
  },

  listGames() {
    const q = encodeURIComponent(
      "appProperties has { key='app' and value='" + this.APP_TAG + "' } and trashed=false"
    );
    const url = 'https://www.googleapis.com/drive/v3/files' +
      '?q=' + q +
      '&orderBy=modifiedTime desc' +
      '&pageSize=20' +
      '&fields=files(id,name,modifiedTime)';

    return this._driveRequest(url).then(resp => {
      if (resp && resp.ok) return resp.json();
      return { files: [] };
    }).then(data => data.files || []);
  },

  loadGame(fileId) {
    this._showStatus('Loading...');

    this._driveRequest(
      'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media'
    ).then(resp => {
      if (resp && resp.ok) return resp.text();
      throw new Error('Load failed');
    }).then(text => {
      if (GameState.importJSON(text)) {
        document.getElementById('modal-settings').classList.remove('active');
        if (GameState.hasActiveGame()) {
          App.resumeGame();
        } else {
          App.showSetup();
        }
        this._showStatus('Loaded!');
      } else {
        this._showStatus('Invalid save file.');
      }
    }).catch(() => {
      this._showStatus('Load failed.');
    });
  },

  deleteGame(fileId) {
    if (!confirm('Delete this save from Google Drive?')) return;

    this._showStatus('Deleting...');

    this._driveRequest(
      'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId),
      { method: 'DELETE' }
    ).then(resp => {
      if (resp && (resp.ok || resp.status === 204)) {
        this._showStatus('Deleted.');
        this.showSavesList();
      } else {
        this._showStatus('Delete failed.');
      }
    }).catch(() => {
      this._showStatus('Delete failed.');
    });
  },

  showSavesList() {
    const listEl = document.getElementById('cloud-saves-list');
    listEl.classList.remove('hidden');
    listEl.innerHTML = '<div class="cloud-status">Loading saves...</div>';

    this.listGames().then(files => {
      if (files.length === 0) {
        listEl.innerHTML = '<div class="cloud-status">No saved games found.</div>';
        return;
      }

      let html = '';
      files.forEach(file => {
        const date = new Date(file.modifiedTime);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        html += '<div class="cloud-save-item">' +
          '<div class="cloud-save-info">' +
            '<div class="cloud-save-name">' + this.escapeHtml(file.name) + '</div>' +
            '<div class="cloud-save-date">' + this.escapeHtml(dateStr) + '</div>' +
          '</div>' +
          '<div class="cloud-save-actions">' +
            '<button class="btn btn-sm btn-primary" data-cloud-load="' + this.escapeHtml(file.id) + '">Load</button>' +
            '<button class="btn btn-sm btn-danger" data-cloud-delete="' + this.escapeHtml(file.id) + '">Delete</button>' +
          '</div>' +
        '</div>';
      });
      listEl.innerHTML = html;
    }).catch(() => {
      listEl.innerHTML = '<div class="cloud-status">Failed to load saves.</div>';
    });
  },

  _showStatus(msg) {
    const el = document.getElementById('cloud-status');
    if (!el) return;
    el.textContent = msg;
    clearTimeout(this._statusTimeout);
    this._statusTimeout = setTimeout(() => { el.textContent = ''; }, 3000);
  },

  _updateUI(signedIn) {
    const signInView = document.getElementById('cloud-sign-in-view');
    const signedInView = document.getElementById('cloud-signed-in');
    const emailEl = document.getElementById('cloud-user-email');
    const savesList = document.getElementById('cloud-saves-list');

    if (signedIn) {
      signInView.classList.add('hidden');
      signedInView.classList.remove('hidden');
      emailEl.textContent = this.userEmail || '';
    } else {
      signInView.classList.remove('hidden');
      signedInView.classList.add('hidden');
      emailEl.textContent = '';
      if (savesList) savesList.classList.add('hidden');
    }
  },

  bindEvents() {
    document.getElementById('cloud-sign-in-btn').addEventListener('click', () => this.signIn());
    document.getElementById('cloud-sign-out-btn').addEventListener('click', () => this.signOut());
    document.getElementById('cloud-save-btn').addEventListener('click', () => this.saveGame());
    document.getElementById('cloud-load-btn').addEventListener('click', () => this.showSavesList());

    document.getElementById('cloud-saves-list').addEventListener('click', (e) => {
      const loadBtn = e.target.closest('[data-cloud-load]');
      if (loadBtn) {
        this.loadGame(loadBtn.dataset.cloudLoad);
        return;
      }
      const deleteBtn = e.target.closest('[data-cloud-delete]');
      if (deleteBtn) {
        this.deleteGame(deleteBtn.dataset.cloudDelete);
      }
    });
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  },
};

/* ============================================================
   PulsePlay — script.js
   Vanilla JavaScript music player
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     SONG DATA
     ============================================================ */
var songs = [
    {
        title: 'Midnight Drive',
        artist: 'Demo Artist',
        src: './assets/song1.mp3',
        cover: './assets/cover1.jpg'
    },
    {
        title: 'Lost in Code',
        artist: 'Demo Artist',
        src: './assets/song2.mp3',
        cover: './assets/cover2.jpg'
    },
    {
        title: 'Night Sky',
        artist: 'Demo Artist',
        src: './assets/song3.mp3',
        cover: './assets/cover3.jpg'
    }
];
  /* ============================================================
     DOM REFERENCES
     ============================================================ */
  var audio = document.getElementById('audioPlayer');
  var albumArt = document.getElementById('albumArt');
  var trackTitle = document.getElementById('trackTitle');
  var trackArtist = document.getElementById('trackArtist');
  var currentTimeEl = document.getElementById('currentTime');
  var totalDurationEl = document.getElementById('totalDuration');
  var progressBar = document.getElementById('progressBar');
  var progressFill = document.getElementById('progressFill');
  var playPauseBtn = document.getElementById('playPauseBtn');
  var playPauseIcon = document.getElementById('playPauseIcon');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var volumeSlider = document.getElementById('volumeSlider');
  var muteBtn = document.getElementById('muteBtn');
  var playlistList = document.getElementById('playlistList');
  var trackCount = document.getElementById('trackCount');
  var audioError = document.getElementById('audioError');

  /* ============================================================
     PLAYER STATE
     ============================================================ */
  var currentSongIndex = 0;
  var isPlaying = false;
  var isSeeking = false;
  var isMuted = false;
  var previousVolume = 70;
  var errorTimer = null;

  /* ============================================================
     ICON PATHS
     ============================================================ */
  var ICON_PLAY = '<path d="M8 5v14l11-7L8 5z"/>';
  var ICON_PAUSE = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';

  /* ============================================================
     UTILITIES
     ============================================================ */
  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function pad2(num) {
    return num < 10 ? '0' + num : '' + num;
  }

  /* ============================================================
     RENDER PLAYLIST
     ============================================================ */
  function renderPlaylist() {
    if (!playlistList) return;

    playlistList.innerHTML = '';

    songs.forEach(function (song, index) {
      var li = document.createElement('li');
      li.className = 'playlist-item' + (index === currentSongIndex ? ' active' : '');
      li.setAttribute('data-index', index);
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-label', 'Play ' + song.title + ' by ' + song.artist);

      var numSpan = document.createElement('span');
      numSpan.className = 'track-number';
      numSpan.textContent = pad2(index + 1);

      var infoDiv = document.createElement('div');
      infoDiv.className = 'playlist-track-info';

      var titleDiv = document.createElement('div');
      titleDiv.className = 'playlist-title';
      titleDiv.textContent = song.title;

      var artistDiv = document.createElement('div');
      artistDiv.className = 'playlist-artist';
      artistDiv.textContent = song.artist;

      infoDiv.appendChild(titleDiv);
      infoDiv.appendChild(artistDiv);

      var durationSpan = document.createElement('span');
      durationSpan.className = 'playlist-duration';
      durationSpan.textContent = '--:--';

      li.appendChild(numSpan);
      li.appendChild(infoDiv);
      li.appendChild(durationSpan);

      li.addEventListener('click', function () {
        selectSong(index);
      });

      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          selectSong(index);
        }
      });

      playlistList.appendChild(li);
    });

    if (trackCount) {
      trackCount.textContent = songs.length + ' tracks';
    }

    loadPlaylistDurations();
  }

  /* ============================================================
     PLAYLIST DURATIONS (using temporary Audio objects)
     ============================================================ */
  function loadPlaylistDurations() {
    var items = playlistList.querySelectorAll('.playlist-item');

    songs.forEach(function (song, idx) {
      if (idx >= items.length) return;

      var tempAudio = new Audio();
      tempAudio.preload = 'metadata';
      tempAudio.src = song.src;

      tempAudio.addEventListener('loadedmetadata', function () {
        if (isFinite(tempAudio.duration)) {
          var durEl = items[idx].querySelector('.playlist-duration');
          if (durEl) {
            durEl.textContent = formatTime(tempAudio.duration);
          }
        }
        tempAudio.src = '';
      });

      tempAudio.addEventListener('error', function () {
        tempAudio.src = '';
      });
    });
  }

  /* ============================================================
     HIGHLIGHT CURRENT SONG
     ============================================================ */
  function highlightCurrentSong() {
    var items = playlistList.querySelectorAll('.playlist-item');
    for (var i = 0; i < items.length; i++) {
      if (i === currentSongIndex) {
        items[i].classList.add('active');
      } else {
        items[i].classList.remove('active');
      }
    }
  }

  /* ============================================================
     UPDATE SONG INFO (title, artist, cover)
     ============================================================ */
  function updateSongInfo(index) {
    var song = songs[index];
    if (!song) return;

    if (trackTitle) trackTitle.textContent = song.title;
    if (trackArtist) trackArtist.textContent = song.artist;

    if (albumArt) {
      albumArt.src = song.cover;
      albumArt.alt = 'Album artwork for ' + song.title;
    }
  }

  /* ============================================================
     LOAD SONG
     ============================================================ */
  function loadSong(index, autoPlay) {
    if (index < 0 || index >= songs.length) return;

    var song = songs[index];
    if (!song) return;

    hideAudioError();

    currentSongIndex = index;

    // Update audio source
    audio.src = song.src;
    audio.load();

    // Update UI
    updateSongInfo(index);
    highlightCurrentSong();

    // Reset progress UI
    if (progressFill) progressFill.style.width = '0%';
    if (progressBar) progressBar.setAttribute('aria-valuenow', '0');
    if (currentTimeEl) currentTimeEl.textContent = '0:00';
    if (totalDurationEl) totalDurationEl.textContent = '0:00';

    if (autoPlay) {
      attemptAutoplay();
    }
  }

  /* ============================================================
     AUTOPLAY HANDLING
     ============================================================ */
  function attemptAutoplay() {
    var playAttempt = audio.play();

    if (playAttempt && typeof playAttempt.then === 'function') {
      playAttempt.then(function () {
        isPlaying = true;
        updatePlayPauseIcon();
      }).catch(function (err) {
        isPlaying = false;
        updatePlayPauseIcon();

        if (err && err.name === 'NotAllowedError') {
          // Browser blocked autoplay — user must interact
          // Do not show error, just wait
        } else {
          showAudioError();
        }
      });
    }
  }

  /* ============================================================
     PLAY / PAUSE
     ============================================================ */
  function playSong() {
    if (!audio.src) {
      loadSong(0, true);
      return;
    }

    var playAttempt = audio.play();

    if (playAttempt && typeof playAttempt.then === 'function') {
      playAttempt.then(function () {
        isPlaying = true;
        updatePlayPauseIcon();
      }).catch(function (err) {
        isPlaying = false;
        updatePlayPauseIcon();

        if (err && err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
          showAudioError();
        }
      });
    } else {
      isPlaying = !audio.paused;
      updatePlayPauseIcon();
    }
  }

  function pauseSong() {
    audio.pause();
    isPlaying = false;
    updatePlayPauseIcon();
  }

  function togglePlay() {
    if (!audio.src) {
      loadSong(0, true);
      return;
    }

    if (audio.paused) {
      playSong();
    } else {
      pauseSong();
    }
  }

  function updatePlayPauseIcon() {
    if (!playPauseIcon || !playPauseBtn) return;

    if (isPlaying) {
      playPauseIcon.innerHTML = ICON_PAUSE;
      playPauseBtn.setAttribute('aria-label', 'Pause');
    } else {
      playPauseIcon.innerHTML = ICON_PLAY;
      playPauseBtn.setAttribute('aria-label', 'Play');
    }
  }

  /* ============================================================
     NEXT / PREVIOUS
     ============================================================ */
  function nextSong() {
    var newIndex = (currentSongIndex + 1) % songs.length;
    loadSong(newIndex, true);
  }

  function previousSong() {
    var newIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    loadSong(newIndex, true);
  }

  /* ============================================================
     SELECT SONG FROM PLAYLIST
     ============================================================ */
  function selectSong(index) {
    if (index < 0 || index >= songs.length) return;

    if (index === currentSongIndex) {
      togglePlay();
      return;
    }

    loadSong(index, true);
  }

  /* ============================================================
     PROGRESS BAR
     ============================================================ */
  function updateProgress() {
    if (!audio.duration || !isFinite(audio.duration)) return;
    if (isSeeking) return;

    var percent = (audio.currentTime / audio.duration) * 100;

    if (progressFill) progressFill.style.width = percent + '%';
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(Math.round(percent)));
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
    if (totalDurationEl) totalDurationEl.textContent = formatTime(audio.duration);
  }

  function setProgressFromEvent(e) {
    if (!progressBar || !audio.duration || !isFinite(audio.duration)) return;

    var rect = progressBar.getBoundingClientRect();
    var clientX = 0;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    var ratio = (clientX - rect.left) / rect.width;
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;

    audio.currentTime = ratio * audio.duration;

    if (progressFill) progressFill.style.width = (ratio * 100) + '%';
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
  }

  function setupProgressBar() {
    if (!progressBar) return;

    progressBar.addEventListener('mousedown', function (e) {
      isSeeking = true;
      setProgressFromEvent(e);
      e.preventDefault();
    });

    progressBar.addEventListener('touchstart', function (e) {
      isSeeking = true;
      setProgressFromEvent(e);
      e.preventDefault();
    }, { passive: false });

    progressBar.addEventListener('keydown', function (e) {
      if (!audio.duration || !isFinite(audio.duration)) return;

      var step = audio.duration * 0.05;

      if (e.key === 'ArrowRight') {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + step);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        audio.currentTime = Math.max(0, audio.currentTime - step);
        e.preventDefault();
      }
    });
  }

  /* ============================================================
     VOLUME
     ============================================================ */
  function setVolume(value) {
    var vol = value / 100;
    if (vol < 0) vol = 0;
    if (vol > 1) vol = 1;

    audio.volume = vol;

    if (vol > 0) {
      audio.muted = false;
      isMuted = false;
      if (muteBtn) muteBtn.classList.remove('muted');
    } else {
      isMuted = true;
      if (muteBtn) muteBtn.classList.add('muted');
    }

    if (volumeSlider) volumeSlider.value = String(value);

    if (vol > 0) previousVolume = value;
  }

  function toggleMute() {
    if (audio.muted || audio.volume === 0) {
      audio.muted = false;
      var restored = previousVolume > 0 ? previousVolume : 70;
      setVolume(restored);
      isMuted = false;
      if (muteBtn) muteBtn.classList.remove('muted');
    } else {
      previousVolume = Math.round(audio.volume * 100) || 70;
      audio.muted = true;
      audio.volume = 0;
      if (volumeSlider) volumeSlider.value = '0';
      isMuted = true;
      if (muteBtn) muteBtn.classList.add('muted');
    }
  }

  /* ============================================================
     AUDIO ERROR
     ============================================================ */
  function showAudioError() {
    if (!audioError) return;
    audioError.classList.add('visible');

    if (errorTimer) clearTimeout(errorTimer);
    errorTimer = setTimeout(function () {
      audioError.classList.remove('visible');
    }, 4000);
  }

  function hideAudioError() {
    if (!audioError) return;
    audioError.classList.remove('visible');
    if (errorTimer) {
      clearTimeout(errorTimer);
      errorTimer = null;
    }
  }

  /* ============================================================
     AUDIO EVENT LISTENERS
     ============================================================ */
  function setupAudioEvents() {
    audio.addEventListener('timeupdate', updateProgress);

    audio.addEventListener('loadedmetadata', function () {
      if (totalDurationEl) totalDurationEl.textContent = formatTime(audio.duration);
      updateProgress();
    });

    audio.addEventListener('durationchange', function () {
      if (totalDurationEl) totalDurationEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('ended', function () {
      nextSong();
    });

    audio.addEventListener('error', function () {
      showAudioError();
      isPlaying = false;
      updatePlayPauseIcon();
    });

    audio.addEventListener('play', function () {
      isPlaying = true;
      updatePlayPauseIcon();
    });

    audio.addEventListener('pause', function () {
      isPlaying = false;
      updatePlayPauseIcon();
    });
  }

  /* ============================================================
     GLOBAL MOUSE / TOUCH RELEASE (for seeking)
     ============================================================ */
  function setupSeekingRelease() {
    function handleRelease(e) {
      if (!isSeeking) return;
      isSeeking = false;
      setProgressFromEvent(e);
    }

    document.addEventListener('mousemove', function (e) {
      if (isSeeking) setProgressFromEvent(e);
    });

    document.addEventListener('mouseup', handleRelease);

    document.addEventListener('touchmove', function (e) {
      if (isSeeking) {
        setProgressFromEvent(e);
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchend', handleRelease);
    document.addEventListener('touchcancel', handleRelease);
  }

  /* ============================================================
     UI EVENT LISTENERS
     ============================================================ */
  function setupUIEvents() {
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', togglePlay);
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', nextSong);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', previousSong);
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', function (e) {
        setVolume(parseInt(e.target.value, 10));
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener('click', toggleMute);
    }
  }

  /* ============================================================
     KEYBOARD CONTROLS
     ============================================================ */
  function setupKeyboardControls() {
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) ?
        document.activeElement.tagName.toLowerCase() : '';

      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSong();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        previousSong();
      }
    });
  }

  /* ============================================================
     INITIALIZATION
     ============================================================ */
  function init() {
    renderPlaylist();
    updatePlayPauseIcon();

    // Initial volume
    audio.volume = 0.7;
    if (volumeSlider) volumeSlider.value = '70';
    previousVolume = 70;

    // Load first song (do not auto-play — browsers may block)
    loadSong(0, false);

    setupAudioEvents();
    setupUIEvents();
    setupProgressBar();
    setupSeekingRelease();
    setupKeyboardControls();
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
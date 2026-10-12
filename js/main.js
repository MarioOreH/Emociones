/**
 * @fileoverview Diccionario Digital Interactivo de las Emociones
 *
 * LECCIÓN (5 emociones) → tramos CONSECUTIVOS del video assets/video/emociones.mp4
 * (1280 x 720, 10 s, una sola toma). Cada tramo se reproduce y se PAUSA en el
 * cuadro donde la emoción se ve más clara. Al pasar a la siguiente emoción el
 * video sigue desde donde se pausó: sin cortes, sin fundidos, sin pantalla en negro.
 *
 *   (base)       0.0 – ...  cara NEUTRA: primer cuadro de la pantalla de inicio
 *   FELIZ        0.0 – 2.7 s
 *   TRISTE       2.7 – 4.25 s
 *   ENOJADO      4.25 – 5.5 s
 *   ASUSTADO     5.5 – 7.2 s
 *   SORPRENDIDO  7.2 – 8.3 s
 *
 * JUEGO → 5 fotos (sin la neutra); se toca la foto de la emoción preguntada.
 * VOZ: las frases y preguntas las lee la voz virtual del navegador (SpeechSynthesis,
 * en español). No se necesitan archivos de audio. El botón de sonido la silencia.
 *
 * @version 1.1.0
 */

'use strict';

/* ============================================================
   DATOS
   ============================================================ */

const IMG = './assets/images/';

const EMOTIONS = [
  {
    id: 'feliz', label: 'FELIZ', icon: '😊', color: '#f29a00',
    phrase:   'Me siento feliz cuando algo me gusta y sonrío.',
    question: '¿Quién se siente feliz?',
    answer:   'Él se siente feliz.',
    photo: IMG + 'feliz.jpg',
    clip: { start: 0.00, end: 2.70 },
  },
  {
    id: 'triste', label: 'TRISTE', icon: '😢', color: '#2f80ed',
    phrase:   'Me siento triste cuando algo me duele.',
    question: '¿Quién se siente triste?',
    answer:   'Él se siente triste.',
    photo: IMG + 'triste.jpg',
    clip: { start: 2.70, end: 4.25 },
  },
  {
    id: 'enojado', label: 'ENOJADO', icon: '😠', color: '#e5484d',
    phrase:   'Me siento enojado cuando alguien me fastidia.',
    question: '¿Quién se siente enojado?',
    answer:   'Él se siente enojado.',
    photo: IMG + 'enojado.jpg',
    clip: { start: 4.25, end: 5.50 },
  },
  {
    id: 'asustado', label: 'ASUSTADO', icon: '😨', color: '#7b3fd4',
    phrase:   'Me siento asustado cuando veo una araña.',
    question: '¿Quién se siente asustado?',
    answer:   'Él se siente asustado.',
    photo: IMG + 'asustado.jpg',
    clip: { start: 5.50, end: 7.20 },
  },
  {
    id: 'sorprendido', label: 'SORPRENDIDO', icon: '😮', color: '#0fa5c0',
    phrase:   'Me siento sorprendido cuando ocurre algo que no esperaba.',
    question: '¿Quién se siente sorprendido?',
    answer:   'Él se siente sorprendido.',
    photo: IMG + 'sorprendido.jpg',
    clip: { start: 7.20, end: 8.30 },
  },
];

const TOTAL = EMOTIONS.length;

/* ============================================================
   UTILIDADES
   ============================================================ */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ============================================================
   VOZ VIRTUAL (SpeechSynthesis del navegador, sin archivos de audio)
   ============================================================ */

class VoiceManager {
  constructor() {
    this._synth  = 'speechSynthesis' in window ? window.speechSynthesis : null;
    this._voice  = null;
    this._muted  = false;
    this._timer  = 0;
    this._resolve = null;
    if (this._synth) {
      this._pickVoice();
      this._synth.addEventListener?.('voiceschanged', () => this._pickVoice());
    }
  }

  get muted()    { return this._muted; }
  get hasVoice() { return !!this._voice; }

  /** Elige la mejor voz en español disponible (prefiere es-PE / es-419 / es-US / es-MX). */
  _pickVoice() {
    const all = this._synth.getVoices();
    const es  = all.filter((v) => /^es([-_]|$)/i.test(v.lang));
    if (!es.length) { this._voice = null; return; }
    const rank = (v) => {
      const lang = v.lang.replace('_', '-').toLowerCase();
      const order = ['es-pe', 'es-419', 'es-us', 'es-mx', 'es-co', 'es-ar', 'es-es'];
      let s = order.indexOf(lang); s = s < 0 ? order.length : s;
      if (/google|natural|online|neural|premium|paulina|monica|sabina|helena|laura/i.test(v.name)) s -= 0.5;
      return s;
    };
    this._voice = es.sort((a, b) => rank(a) - rank(b))[0];
  }

  /** Lee el texto. Devuelve una promesa que se cumple al terminar (o al cancelarse). */
  speak(text) {
    this.stop();
    if (!this._synth || this._muted) return Promise.resolve();
    return new Promise((resolve) => {
      this._resolve = resolve;
      const u = new SpeechSynthesisUtterance(text);
      u.lang   = this._voice ? this._voice.lang : 'es-PE';
      if (this._voice) u.voice = this._voice;
      u.rate   = 0.9;     // un poco más lento para niños
      u.pitch  = 1.1;
      const done = () => { clearTimeout(this._timer); if (this._resolve === resolve) this._resolve = null; resolve(); };
      u.onend = done; u.onerror = done;
      // Respaldo: si el navegador nunca avisa que terminó
      this._timer = setTimeout(done, 1500 + text.length * 110);
      // Pequeño retraso: evita que cancel() + speak() seguidos se pierdan en Chrome
      setTimeout(() => { if (this._resolve === resolve) this._synth.speak(u); }, 60);
    });
  }

  stop() {
    clearTimeout(this._timer);
    if (this._synth) this._synth.cancel();
    if (this._resolve) { const r = this._resolve; this._resolve = null; r(); }
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this._muted) this.stop();
    return this._muted;
  }
}

/* ============================================================
   ESCENA (video continuo / tarjetas del juego)
   ============================================================ */

class SceneController {
  constructor(videoEl, imgEl, gridEl, stageEl) {
    this._video = videoEl;
    this._img   = imgEl;
    this._grid  = gridEl;
    this._stage = stageEl;
    this._videoOk = true;
    // Si el video no carga, se muestra la foto neutra como respaldo
    videoEl.addEventListener('error', () => {
      this._videoOk = false;
      videoEl.hidden = true;
      imgEl.hidden = false;
    });
  }

  _seek(time, force = false) {
    const v = this._video;
    return new Promise((resolve) => {
      const go = () => {
        if (!force && Math.abs(v.currentTime - time) < 0.02 && v.readyState >= 2) { resolve(); return; }
        const done = () => { v.removeEventListener('seeked', done); clearTimeout(t); resolve(); };
        const t = setTimeout(done, 1500);
        v.addEventListener('seeked', done);
        v.currentTime = time;
      };
      if (v.readyState >= 1) go();
      else {
        v.addEventListener('loadedmetadata', go, { once: true });
        setTimeout(resolve, 2000);
      }
    });
  }

  /** Muestra el video (pantalla de inicio / lección) y oculta el juego. */
  _showVideoLayer() {
    this._stage.classList.remove('is-game');
    this._grid.hidden = true;
    if (this._videoOk) { this._img.hidden = true; this._video.hidden = false; }
    else               { this._video.hidden = true; this._img.hidden = false; }
  }

  /** Pantalla de inicio: primer cuadro del video (cara neutra). */
  showHome() {
    this._video.pause();
    this._showVideoLayer();
    if (this._videoOk) this._seek(0, true);
  }

  /**
   * Reproduce el tramo [start, end] y lo pausa en `end`.
   * Si el video ya está pausado dentro/al inicio del tramo (navegación hacia
   * adelante) SIGUE desde ahí: sin saltos, sin fundidos.
   */
  async playClip(clip, isStale) {
    const v = this._video;
    this._showVideoLayer();
    if (!this._videoOk) return;

    const t = v.currentTime;
    const continuous = t >= clip.start - 0.08 && t < clip.end - 0.05;
    if (!continuous) {
      await this._seek(clip.start, true);   // salto instantáneo (solo al repetir / retroceder)
      if (isStale()) return;
    }

    try { await v.play(); } catch (e) { /* autoplay bloqueado */ }

    while (!isStale() && !v.paused && !v.ended && v.currentTime < clip.end) {
      await sleep(30);
    }
    if (isStale()) return;
    v.pause();
    await this._seek(clip.end, true);       // cuadro EXACTO del final
  }

  /** Juego: oculta el video y muestra las tarjetas. */
  showGame() {
    this._video.pause();
    this._video.hidden = true;
    this._img.hidden   = true;
    this._stage.classList.add('is-game');
    this._grid.hidden  = false;
  }
}

/* ============================================================
   ESTADO
   ============================================================ */

class StateManager {
  constructor() {
    this._mode  = 'welcome';
    this._epoch = 0;
  }
  get mode()  { return this._mode; }
  get epoch() { return this._epoch; }
  newEpoch()  { return ++this._epoch; }

  show(name) {
    this._mode = name;
    ['welcome', 'lesson', 'game', 'finish'].forEach((id) => { $(id).hidden = id !== name; });
    $('controls').hidden = name === 'welcome' || name === 'finish';
    $('prev').hidden     = name === 'game';
    $('next').hidden     = name === 'game';
  }

  updateProgress(current, total) {
    $('dots').innerHTML = Array.from({ length: total }, (_, n) => {
      const cls = n === current ? 'current' : n < current ? 'done' : '';
      return `<span class="dot ${cls}"></span>`;
    }).join('');
  }
}

/* ============================================================
   LECCIÓN
   ============================================================ */

class LessonMode {
  constructor(scene, state, voice) {
    this._scene = scene;
    this._state = state;
    this._voice = voice;
    this._index = 0;
  }

  async goTo(i) {
    const token = this._reset();
    this._index = i;
    this._state.show('lesson');

    $('prev').disabled    = i === 0;
    $('next').textContent = i === TOTAL - 1 ? 'JUGAR →' : 'SIGUIENTE →';
    $('count').textContent = `${i + 1} DE ${TOTAL}`;
    this._state.updateProgress(i, TOTAL);

    await this._play(i, token);
  }

  /** Muestra el texto y reproduce el tramo de video a la vez. */
  async _play(i, token) {
    const e = EMOTIONS[i];
    $('word').textContent       = e.label;
    $('word').style.setProperty('--w', e.color);
    $('word').className         = e.label.length >= 11 ? 'xlong' : e.label.length >= 8 ? 'long' : '';
    $('phrase').textContent     = e.phrase;
    $('lessonIcon').textContent = e.icon;
    $('lessonIcon').hidden      = false;
    this._voice.speak(e.phrase);            // la voz lee la frase mientras corre el video
    await this._scene.playClip(e.clip, () => token !== this._state.epoch);
  }

  /** Vuelve a reproducir el tramo de la emoción actual. */
  async repeat() {
    const token = this._reset();
    this._state.show('lesson');
    await this._play(this._index, token);
  }

  prev() { if (this._index > 0) this.goTo(this._index - 1); }

  next() {
    if (this._index < TOTAL - 1) { this.goTo(this._index + 1); return false; }
    return true; // → iniciar juego
  }

  _reset() {
    const token = this._state.newEpoch();
    this._voice.stop();
    $('celebration').hidden = true;
    $('stage').classList.remove('encourage');
    return token;
  }
}

/* ============================================================
   JUEGO
   ============================================================ */

class GameMode {
  constructor(scene, state, voice) {
    this._scene  = scene;
    this._state  = state;
    this._voice  = voice;
    this._queue  = [];
    this._turn   = 0;
    this._ready  = false;
    this._locked = false;
  }

  start() {
    this._scene.showGame();
    this._queue = shuffle(EMOTIONS);   // la "neutra" no participa
    this._turn  = 0;
    this._ask();
  }

  _ask() {
    const token = this._state.newEpoch();
    $('celebration').hidden = true;
    this._state.show('game');
    const cur = this._queue[this._turn];
    $('question').textContent  = cur.question;
    $('feedback').textContent  = '👆 TOCA LA FOTO';
    $('gameCount').textContent = `${this._turn + 1} DE ${this._queue.length}`;

    // Las fotos cambian de lugar en cada pregunta
    const grid = $('gameGrid');
    grid.innerHTML = '';
    shuffle(EMOTIONS).forEach((e, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emo-card';
      b.dataset.emo = e.id;
      b.setAttribute('aria-label', `Foto ${n + 1}`);
      b.innerHTML = `<img src="${e.photo}" alt="" draggable="false">`;
      b.addEventListener('click', () => this.pick(b, token));
      grid.appendChild(b);
    });
    this._ready  = true;
    this._locked = false;
    this._voice.speak(cur.question);
  }

  repeatQuestion() {
    if (!this._locked && this._queue[this._turn]) this._voice.speak(this._queue[this._turn].question);
  }

  async pick(card, token) {
    if (!this._ready || this._locked || token !== this._state.epoch) return;
    this._locked = true;
    const cur = this._queue[this._turn];

    if (card.dataset.emo === cur.id) {
      card.classList.add('correct');
      document.querySelectorAll('.emo-card').forEach((c) => { c.disabled = true; if (c !== card) c.classList.add('dim'); });
      $('feedback').textContent = `¡MUY BIEN! ${cur.answer}`;
      $('celebration').hidden   = false;
      await Promise.all([sleep(2200), this._voice.speak(`¡Muy bien! ${cur.answer}`)]);
      if (token !== this._state.epoch) return;
      this._turn++;
      if (this._turn < this._queue.length) this._ask();
      else this._finish();
    } else {
      card.classList.add('wrong', 'dim');
      card.disabled = true;
      $('feedback').textContent = '¡INTÉNTALO OTRA VEZ!';
      this._voice.speak('Inténtalo otra vez');
      await sleep(700);
      if (token !== this._state.epoch) return;
      card.classList.remove('wrong');
      $('feedback').textContent = '👆 TOCA LA FOTO';
      this._locked = false;
    }
  }

  _finish() {
    this._state.newEpoch();
    $('celebration').hidden = true;
    this._state.show('finish');
    this._voice.speak('¡Excelente trabajo! ¡Ya reconoces las emociones!');
  }
}

/* ============================================================
   APP
   ============================================================ */

class App {
  constructor() {
    this.scene  = new SceneController($('sceneVideo'), $('sceneImg'), $('gameGrid'), $('stage'));
    this.voice  = new VoiceManager();
    this.state  = new StateManager();
    this.lesson = new LessonMode(this.scene, this.state, this.voice);
    this.game   = new GameMode(this.scene, this.state, this.voice);

    this.state.show('welcome');
    this.scene.showHome();
    this._bind();
    this._voiceStatus();
  }

  /** Aviso si el dispositivo no tiene voz en español. */
  _voiceStatus() {
    const show = () => {
      $('status').textContent = ('speechSynthesis' in window && !this.voice.hasVoice)
        ? 'SI NO ESCUCHAS LA VOZ, INSTALA UNA VOZ EN ESPAÑOL EN TU DISPOSITIVO.' : '';
    };
    setTimeout(show, 1500);
    window.speechSynthesis?.addEventListener?.('voiceschanged', show);
  }

  _bind() {
    $('start').onclick      = () => this.lesson.goTo(0);
    $('prev').onclick       = () => { if (this.state.mode === 'lesson') this.lesson.prev(); };
    $('next').onclick       = () => {
      if (this.state.mode === 'lesson' && this.lesson.next()) this.game.start();
    };
    $('listen').onclick     = () => { if (this.state.mode === 'lesson') this.lesson.repeat(); };
    $('repeat').onclick     = () => {
      if (this.state.mode === 'lesson') this.lesson.repeat();
      else if (this.state.mode === 'game') this.game.repeatQuestion();
    };
    $('home').onclick       = () => {
      this.state.newEpoch();
      this.voice.stop();
      $('celebration').hidden = true;
      this.scene.showHome();
      this.state.show('welcome');
    };
    $('again').onclick      = () => this.game.start();
    $('dictionary').onclick = () => this.lesson.goTo(0);

    $('sound').onclick = () => {
      const muted = this.voice.toggleMute();
      $('sound').setAttribute('aria-label', muted ? 'Activar voz' : 'Desactivar voz');
      $('sound').setAttribute('aria-pressed', String(!muted));
      if (!muted) {
        if (this.state.mode === 'lesson') this.lesson.repeat();
        else if (this.state.mode === 'game') this.game.repeatQuestion();
      }
    };

    document.addEventListener('visibilitychange', () => { if (document.hidden) this.voice.stop(); });
  }
}

const app = new App();

import init, { ImageProcessor } from './pkg/wasm_camera_filter.js';

/**
 * カメラ制御クラス
 * WebRTC APIを使用したカメラアクセスとストリーム管理
 */
class CameraController {
    constructor() {
        this.stream = null;
        this.video = null;
        this.currentFacingMode = 'environment'; // 'user' = フロント, 'environment' = バック（初期はアウトカメラ）
    }

    /**
     * カメラを初期化
     * @param {HTMLVideoElement} videoElement - ビデオ要素
     * @returns {Promise<boolean>} 初期化成功フラグ
     */
    async initCamera(videoElement) {
        this.video = videoElement;
        
        try {
            console.log('カメラアクセスを要求中...');
            
            // カメラ制約設定（モバイル最適化）
            const constraints = {
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 30, max: 60 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            console.log('カメラアクセス成功');
            return true;
            
        } catch (error) {
            console.error('カメラアクセスエラー:', error);
            this.handleCameraError(error);
            return false;
        }
    }

    /**
     * カメラエラーハンドリング
     * @param {Error} error - エラーオブジェクト
     */
    handleCameraError(error) {
        let errorMessage = 'カメラアクセスに失敗しました';
        
        switch (error.name) {
            case 'NotAllowedError':
                errorMessage = 'カメラアクセスが拒否されました。ブラウザの設定を確認してください。';
                break;
            case 'NotFoundError':
                errorMessage = 'カメラが見つかりません。デバイスを確認してください。';
                break;
            case 'NotReadableError':
                errorMessage = 'カメラが他のアプリケーションで使用中です。';
                break;
            case 'OverconstrainedError':
                errorMessage = '要求されたカメラ設定がサポートされていません。';
                break;
            default:
                errorMessage = `カメラエラー: ${error.message}`;
        }
        
        this.showError(errorMessage);
    }

    /**
     * エラーメッセージを表示
     * @param {string} message - エラーメッセージ
     */
    showError(message) {
        const errorElement = document.getElementById('error-message');
        const loadingElement = document.getElementById('loading');
        
        if (errorElement) {
            errorElement.querySelector('p').textContent = message;
            errorElement.classList.remove('hidden');
        }
        
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }

    /**
     * カメラを切り替え（フロント⇔バック）
     */
    async toggleCamera() {
        if (!this.stream) return;
        
        console.log(`カメラ切り替え: ${this.currentFacingMode} → ${this.currentFacingMode === 'user' ? 'environment' : 'user'}`);
        
        // 現在のストリームを停止
        this.stopStream();
        
        // カメラを切り替え
        this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
        
        // 新しいカメラで再初期化
        const success = await this.initCamera(this.video);
        
        return success;
    }

    /**
     * ストリームを停止
     */
    stopStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    /**
     * 現在のフレームをキャプチャ
     * @param {HTMLCanvasElement} canvas - キャンバス要素
     * @returns {ImageData} 画像データ
     */
    captureFrame(canvas) {
        if (!this.video || !canvas) return null;
        
        const ctx = canvas.getContext('2d');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        
        ctx.drawImage(this.video, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
}

/**
 * フィルタエンジンクラス
 * WebAssemblyとJavaScriptの両方の実装を提供
 */
class FilterEngine {
    constructor(useWasm = true) {
        this.useWasm = useWasm;
        this.wasmProcessor = null;
        this.currentEffect = 0; // 0: HDRアニメ調（初期エフェクト）
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
    }

    /**
     * WebAssemblyプロセッサを初期化
     * @param {ImageProcessor} processor - WASMプロセッサ
     */
    setWasmProcessor(processor) {
        this.wasmProcessor = processor;
    }

    /**
     * エフェクトを設定
     * @param {number} effectType - エフェクトタイプ (0-4)
     */
    setEffect(effectType) {
        this.currentEffect = effectType;
        console.log(`エフェクト変更: ${this.getEffectName(effectType)}`);
    }

    /**
     * エフェクト名を取得
     * @param {number} effectType - エフェクトタイプ
     * @returns {string} エフェクト名
     */
    getEffectName(effectType) {
        const names = ['HDRアニメ調', 'ガウシアンブラー', 'エッジ検出', 'セピア調', 'ネガフィルム', 'シャープネス'];
        return names[effectType] || '不明';
    }

    /**
     * フィルタを適用
     * @param {ImageData} imageData - 画像データ
     * @returns {ImageData} 処理済み画像データ
     */
    applyFilter(imageData) {
        const startTime = performance.now();
        
        if (this.useWasm && this.wasmProcessor) {
            this.applyWasmFilter(imageData);
        } else {
            this.applyJsFilter(imageData);
        }
        
        // FPS計算
        this.updateFPS(startTime);
        
        return imageData;
    }

    /**
     * WebAssemblyフィルタを適用
     * @param {ImageData} imageData - 画像データ
     */
    applyWasmFilter(imageData) {
        const { width, height, data } = imageData;
        
        // WebAssemblyプロセッサのサイズを更新
        if (this.wasmProcessor.width !== width || this.wasmProcessor.height !== height) {
            this.wasmProcessor = new ImageProcessor(width, height);
        }
        
        switch (this.currentEffect) {
            case 0: // HDRアニメ調
                this.wasmProcessor.hdr_anime(data);
                break;
            case 1: // ガウシアンブラー
                this.wasmProcessor.gaussian_blur(data, 3.0);
                break;
            case 2: // エッジ検出
                this.wasmProcessor.edge_detection(data);
                break;
            case 3: // セピア調
                this.wasmProcessor.sepia_tone(data);
                break;
            case 4: // ネガフィルム
                this.wasmProcessor.negative(data);
                break;
            case 5: // シャープネス
                this.wasmProcessor.sharpen(data);
                break;
        }
    }

    /**
     * JavaScriptフィルタを適用
     * @param {ImageData} imageData - 画像データ
     */
    applyJsFilter(imageData) {
        const { width, height, data } = imageData;
        
        switch (this.currentEffect) {
            case 0: // HDRアニメ調（JavaScript版）
                this.jsHdrAnime(data, width, height);
                break;
            case 1: // ガウシアンブラー（JavaScript版）
                this.jsGaussianBlur(data, width, height, 3.0);
                break;
            case 2: // エッジ検出
                this.jsEdgeDetection(data, width, height);
                break;
            case 3: // セピア調
                this.jsSepiaTone(data);
                break;
            case 4: // ネガフィルム
                this.jsNegative(data);
                break;
            case 5: // シャープネス
                this.jsSharpen(data, width, height);
                break;
        }
    }

    /**
     * JavaScript版HDRアニメ調エフェクト（非常に負荷の高い実装）
     * @param {Uint8ClampedArray} data - 画像データ
     * @param {number} width - 幅
     * @param {number} height - 高さ
     */
    jsHdrAnime(data, width, height) {
        // ステップ1: HDR強調処理（WebAssembly版と同等の実装）
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255.0;
            const g = data[i + 1] / 255.0;
            const b = data[i + 2] / 255.0;

            // ガンマ補正（コントラスト強化）
            const gamma = 0.7;
            const enhancedR = Math.pow(r, gamma);
            const enhancedG = Math.pow(g, gamma);
            const enhancedB = Math.pow(b, gamma);

            // 彩度向上
            const saturationBoost = 1.8;
            const gray = enhancedR * 0.299 + enhancedG * 0.587 + enhancedB * 0.114;
            
            const finalR = gray + (enhancedR - gray) * saturationBoost;
            const finalG = gray + (enhancedG - gray) * saturationBoost;
            const finalB = gray + (enhancedB - gray) * saturationBoost;

            data[i] = Math.max(0, Math.min(255, finalR * 255));
            data[i + 1] = Math.max(0, Math.min(255, finalG * 255));
            data[i + 2] = Math.max(0, Math.min(255, finalB * 255));
        }

        // ステップ2: アニメ調処理（色の階調化）
        const levels = 6;
        const step = 255.0 / (levels - 1);
        
        for (let i = 0; i < data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                const value = data[i + c];
                const level = Math.round(value / step);
                data[i + c] = Math.min(255, level * step);
            }
        }

        // ステップ3: エッジ強調処理（WebAssembly版と同等の実装）
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // エッジ検出（Sobel）
                let gx = 0, gy = 0;
                
                // X方向
                gx += this.getGray(tempData, x-1, y-1, width) * -1;
                gx += this.getGray(tempData, x+1, y-1, width) * 1;
                gx += this.getGray(tempData, x-1, y, width) * -2;
                gx += this.getGray(tempData, x+1, y, width) * 2;
                gx += this.getGray(tempData, x-1, y+1, width) * -1;
                gx += this.getGray(tempData, x+1, y+1, width) * 1;
                
                // Y方向
                gy += this.getGray(tempData, x-1, y-1, width) * -1;
                gy += this.getGray(tempData, x, y-1, width) * -2;
                gy += this.getGray(tempData, x+1, y-1, width) * -1;
                gy += this.getGray(tempData, x-1, y+1, width) * 1;
                gy += this.getGray(tempData, x, y+1, width) * 2;
                gy += this.getGray(tempData, x+1, y+1, width) * 1;
                
                const edgeStrength = Math.sqrt(gx * gx + gy * gy) / 255.0;
                const enhancement = 1.0 + edgeStrength * 0.5;
                
                // エッジ強調を適用
                for (let c = 0; c < 3; c++) {
                    const original = tempData[idx + c];
                    const enhanced = original * enhancement;
                    data[idx + c] = Math.min(255, enhanced);
                }
            }
        }
    }

    /**
     * JavaScript版ガウシアンブラー（より負荷の高い実装）
     * @param {Uint8ClampedArray} data - 画像データ
     * @param {number} width - 幅
     * @param {number} height - 高さ
     * @param {number} radius - ブラー半径
     */
    jsGaussianBlur(data, width, height, radius) {
        // より負荷の高い処理にするため、複数回適用
        const iterations = 3; // 3回繰り返し処理
        
        for (let iter = 0; iter < iterations; iter++) {
            const kernelSize = Math.floor(radius * 2) + 1;
            const tempData = new Uint8ClampedArray(data);
            
            // 水平方向のブラー
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let rSum = 0, gSum = 0, bSum = 0, count = 0;
                    
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const px = x + kx - Math.floor(radius);
                        if (px >= 0 && px < width) {
                            const idx = (y * width + px) * 4;
                            rSum += tempData[idx];
                            gSum += tempData[idx + 1];
                            bSum += tempData[idx + 2];
                            count++;
                        }
                    }
                    
                    const idx = (y * width + x) * 4;
                    data[idx] = rSum / count;
                    data[idx + 1] = gSum / count;
                    data[idx + 2] = bSum / count;
                }
            }
            
            // 垂直方向のブラー
            tempData.set(data);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let rSum = 0, gSum = 0, bSum = 0, count = 0;
                    
                    for (let ky = 0; ky < kernelSize; ky++) {
                        const py = y + ky - Math.floor(radius);
                        if (py >= 0 && py < height) {
                            const idx = (py * width + x) * 4;
                            rSum += tempData[idx];
                            gSum += tempData[idx + 1];
                            bSum += tempData[idx + 2];
                            count++;
                        }
                    }
                    
                    const idx = (y * width + x) * 4;
                    data[idx] = rSum / count;
                    data[idx + 1] = gSum / count;
                    data[idx + 2] = bSum / count;
                }
            }
        }
    }

    /**
     * JavaScript版エッジ検出
     */
    jsEdgeDetection(data, width, height) {
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Sobelオペレータ
                let gx = 0, gy = 0;
                
                // X方向
                gx += this.getGray(tempData, x-1, y-1, width) * -1;
                gx += this.getGray(tempData, x+1, y-1, width) * 1;
                gx += this.getGray(tempData, x-1, y, width) * -2;
                gx += this.getGray(tempData, x+1, y, width) * 2;
                gx += this.getGray(tempData, x-1, y+1, width) * -1;
                gx += this.getGray(tempData, x+1, y+1, width) * 1;
                
                // Y方向
                gy += this.getGray(tempData, x-1, y-1, width) * -1;
                gy += this.getGray(tempData, x, y-1, width) * -2;
                gy += this.getGray(tempData, x+1, y-1, width) * -1;
                gy += this.getGray(tempData, x-1, y+1, width) * 1;
                gy += this.getGray(tempData, x, y+1, width) * 2;
                gy += this.getGray(tempData, x+1, y+1, width) * 1;
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const value = Math.min(255, magnitude);
                
                data[idx] = value;
                data[idx + 1] = value;
                data[idx + 2] = value;
            }
        }
    }

    /**
     * JavaScript版セピア調
     */
    jsSepiaTone(data) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
            data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
            data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        }
    }

    /**
     * JavaScript版ネガフィルム
     */
    jsNegative(data) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
        }
    }

    /**
     * JavaScript版シャープネス
     */
    jsSharpen(data, width, height) {
        const tempData = new Uint8ClampedArray(data);
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let ky = 0; ky < 3; ky++) {
                        for (let kx = 0; kx < 3; kx++) {
                            const px = x + kx - 1;
                            const py = y + ky - 1;
                            const pidx = (py * width + px) * 4 + c;
                            sum += tempData[pidx] * kernel[ky * 3 + kx];
                        }
                    }
                    data[idx + c] = Math.max(0, Math.min(255, sum));
                }
            }
        }
    }

    /**
     * グレースケール値を取得
     */
    getGray(data, x, y, width) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        return r * 0.299 + g * 0.587 + b * 0.114;
    }

    /**
     * FPS更新
     */
    updateFPS(startTime) {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }

    /**
     * 現在のFPSを取得
     */
    getFPS() {
        return this.fps;
    }
}

/**
 * アプリケーションメインクラス
 */
class CameraFilterApp {
    constructor() {
        this.camera = new CameraController();
        this.wasmEngine = new FilterEngine(true);
        this.jsEngine = new FilterEngine(false);
        this.currentEngine = this.wasmEngine;
        this.isProcessing = false;
        this.animationId = null;
        
        // DOM要素
        this.video = null;
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * アプリケーション初期化
     */
    async init() {
        try {
            console.log('WebAssemblyモジュールを初期化中...');
            await init();
            
            // WebAssemblyプロセッサを初期化
            const processor = new ImageProcessor(640, 480);
            this.wasmEngine.setWasmProcessor(processor);
            
            console.log('WebAssembly初期化完了');
            
            // DOM要素を取得
            this.setupDOM();
            
            // イベントリスナーを設定
            this.setupEventListeners();
            
            // カメラを初期化
            await this.initCamera();
            
        } catch (error) {
            console.error('初期化エラー:', error);
            this.camera.showError('アプリケーションの初期化に失敗しました');
        }
    }

    /**
     * DOM要素をセットアップ
     */
    setupDOM() {
        this.video = document.getElementById('camera-video');
        this.canvas = document.getElementById('output-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.video || !this.canvas) {
            throw new Error('必要なDOM要素が見つかりません');
        }
    }

    /**
     * イベントリスナーをセットアップ
     */
    setupEventListeners() {
        // エフェクトボタン
        document.querySelectorAll('.effect-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const effect = parseInt(e.target.dataset.effect);
                this.setEffect(effect);
                
                // アクティブ状態を更新
                document.querySelectorAll('.effect-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // エンジン切り替えボタン
        document.getElementById('wasm-engine').addEventListener('click', () => {
            this.switchEngine(true);
        });
        
        document.getElementById('js-engine').addEventListener('click', () => {
            this.switchEngine(false);
        });

        // 撮影ボタン
        document.getElementById('capture-btn').addEventListener('click', () => {
            this.captureImage();
        });

        // カメラ切り替えボタン
        document.getElementById('toggle-camera').addEventListener('click', async () => {
            console.log('カメラ切り替えボタンがクリックされました');
            
            // 現在の処理を一時停止
            this.stopProcessing();
            
            // カメラを切り替え
            const success = await this.camera.toggleCamera();
            
            if (success) {
                console.log('カメラ切り替え成功、処理を再開します');
                // 少し待ってから処理を再開
                setTimeout(() => {
                    this.startProcessing();
                }, 500);
            } else {
                console.error('カメラ切り替えに失敗しました');
            }
        });

        // 再試行ボタン
        document.getElementById('retry-camera').addEventListener('click', () => {
            this.initCamera();
        });
    }

    /**
     * カメラ初期化
     */
    async initCamera() {
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error-message');
        
        // UI状態をリセット
        loadingElement.classList.remove('hidden');
        errorElement.classList.add('hidden');
        
        // 既存の処理を停止
        this.stopProcessing();
        
        const success = await this.camera.initCamera(this.video);
        
        if (success) {
            loadingElement.classList.add('hidden');
            
            // メタデータ読み込み完了後に処理開始
            const startProcessingWhenReady = () => {
                if (this.video.readyState >= 2) { // HAVE_CURRENT_DATA以上
                    console.log('ビデオメタデータ読み込み完了、処理を開始します');
                    this.startProcessing();
                } else {
                    // まだ準備できていない場合は少し待つ
                    setTimeout(startProcessingWhenReady, 100);
                }
            };
            
            this.video.addEventListener('loadedmetadata', startProcessingWhenReady, { once: true });
            
            // 既に読み込み済みの場合は即座に開始
            if (this.video.readyState >= 2) {
                startProcessingWhenReady();
            }
        }
    }

    /**
     * 画像処理を開始
     */
    startProcessing() {
        if (this.isProcessing) {
            console.log('既に処理中です');
            return;
        }
        
        // ビデオが準備できているかチェック
        if (!this.video || this.video.readyState < 2) {
            console.log('ビデオがまだ準備できていません');
            return;
        }
        
        this.isProcessing = true;
        console.log('リアルタイム画像処理を開始');
        
        const processFrame = () => {
            if (!this.isProcessing) {
                console.log('処理が停止されました');
                return;
            }
            
            try {
                // フレームをキャプチャ
                const imageData = this.camera.captureFrame(this.canvas);
                
                if (imageData && imageData.data.length > 0) {
                    // WebAssemblyプロセッサのサイズを更新（カメラ切り替え時に解像度が変わる可能性）
                    if (this.wasmEngine.wasmProcessor) {
                        const { width, height } = imageData;
                        if (this.wasmEngine.wasmProcessor.width !== width || 
                            this.wasmEngine.wasmProcessor.height !== height) {
                            console.log(`画像サイズ変更: ${width}x${height}`);
                            this.wasmEngine.wasmProcessor = new ImageProcessor(width, height);
                        }
                    }
                    
                    // フィルタを適用
                    this.currentEngine.applyFilter(imageData);
                    
                    // 結果を表示
                    this.ctx.putImageData(imageData, 0, 0);
                    
                    // FPS表示を更新
                    this.updateFPSDisplay();
                }
            } catch (error) {
                console.error('フレーム処理エラー:', error);
            }
            
            this.animationId = requestAnimationFrame(processFrame);
        };
        
        processFrame();
    }

    /**
     * 画像処理を停止
     */
    stopProcessing() {
        if (this.isProcessing) {
            console.log('画像処理を停止します');
            this.isProcessing = false;
        }
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * エフェクトを設定
     */
    setEffect(effectType) {
        this.wasmEngine.setEffect(effectType);
        this.jsEngine.setEffect(effectType);
    }

    /**
     * エンジンを切り替え
     */
    switchEngine(useWasm) {
        this.currentEngine = useWasm ? this.wasmEngine : this.jsEngine;
        
        // UI更新
        document.querySelectorAll('.engine-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = useWasm ? 'wasm-engine' : 'js-engine';
        document.getElementById(activeBtn).classList.add('active');
        
        // 表示更新
        document.getElementById('engine-display').textContent = 
            `Engine: ${useWasm ? 'WASM' : 'JS'}`;
        
        console.log(`エンジン切り替え: ${useWasm ? 'WebAssembly' : 'JavaScript'}`);
    }

    /**
     * FPS表示を更新
     */
    updateFPSDisplay() {
        const wasmFPS = this.wasmEngine.getFPS();
        const jsFPS = this.jsEngine.getFPS();
        const currentFPS = this.currentEngine.getFPS();
        
        document.getElementById('fps-display').textContent = `FPS: ${currentFPS}`;
        document.getElementById('wasm-fps').textContent = wasmFPS || '--';
        document.getElementById('js-fps').textContent = jsFPS || '--';
        
        // 速度比を計算
        if (wasmFPS > 0 && jsFPS > 0) {
            const ratio = (wasmFPS / jsFPS).toFixed(1);
            document.getElementById('speed-ratio').textContent = `${ratio}x`;
        }
    }

    /**
     * 画像をキャプチャして保存
     */
    captureImage() {
        if (!this.canvas) return;
        
        try {
            // 現在のキャンバス内容をダウンロード
            const link = document.createElement('a');
            link.download = `wasm-filter-${Date.now()}.jpg`;
            link.href = this.canvas.toDataURL('image/jpeg', 0.9);
            
            // ダウンロードを実行
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('画像を保存しました');
            
            // 視覚的フィードバック
            this.showCaptureEffect();
            
        } catch (error) {
            console.error('画像保存エラー:', error);
            alert('画像の保存に失敗しました');
        }
    }

    /**
     * 撮影エフェクトを表示
     */
    showCaptureEffect() {
        const canvas = this.canvas;
        const originalFilter = canvas.style.filter;
        
        canvas.style.filter = 'brightness(1.5)';
        setTimeout(() => {
            canvas.style.filter = originalFilter;
        }, 150);
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', async () => {
    const app = new CameraFilterApp();
    await app.init();
});
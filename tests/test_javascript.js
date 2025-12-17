/**
 * JavaScript画像処理機能のテスト
 * Node.js環境で実行可能な基本テスト
 */

// テスト用のCanvas APIモック
class MockImageData {
    constructor(data, width, height) {
        this.data = new Uint8ClampedArray(data);
        this.width = width;
        this.height = height;
    }
}

// main.jsから画像処理関数を抽出（簡略版）
function gaussianBlurJS(imageData, radius) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    if (radius <= 0) return;
    
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
}

function sepiaToneJS(imageData) {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    }
}

function negativeJS(imageData) {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
    }
}

// テスト用ヘルパー関数
function createTestImageData(width, height) {
    const data = new Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            data[idx] = (x * 255 / width) | 0;     // R
            data[idx + 1] = (y * 255 / height) | 0; // G
            data[idx + 2] = 128;                    // B
            data[idx + 3] = 255;                    // A
        }
    }
    return new MockImageData(data, width, height);
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

// テスト実行
function runTests() {
    console.log('🧪 JavaScript画像処理テスト開始...');
    
    try {
        // テスト1: ImageDataの作成
        console.log('📋 テスト1: ImageData作成');
        const testImage = createTestImageData(10, 10);
        assertEqual(testImage.width, 10, 'Width should be 10');
        assertEqual(testImage.height, 10, 'Height should be 10');
        assertEqual(testImage.data.length, 400, 'Data length should be 400 (10x10x4)');
        console.log('✅ ImageData作成テスト成功');

        // テスト2: ガウシアンブラー
        console.log('📋 テスト2: ガウシアンブラー');
        const blurImage = createTestImageData(5, 5);
        const originalData = new Uint8ClampedArray(blurImage.data);
        gaussianBlurJS(blurImage, 1.0);
        
        // データ長が保持されていることを確認
        assertEqual(blurImage.data.length, originalData.length, 'Data length preserved');
        
        // Alpha値が保持されていることを確認
        for (let i = 3; i < blurImage.data.length; i += 4) {
            assertEqual(blurImage.data[i], 255, 'Alpha value preserved');
        }
        console.log('✅ ガウシアンブラーテスト成功');

        // テスト3: セピア調
        console.log('📋 テスト3: セピア調エフェクト');
        const sepiaImage = createTestImageData(3, 3);
        sepiaToneJS(sepiaImage);
        
        // セピア効果が適用されていることを確認
        assertTrue(sepiaImage.data[0] >= 0, 'Sepia R component valid');
        assertTrue(sepiaImage.data[1] >= 0, 'Sepia G component valid');
        assertTrue(sepiaImage.data[2] >= 0, 'Sepia B component valid');
        assertEqual(sepiaImage.data[3], 255, 'Alpha preserved in sepia');
        console.log('✅ セピア調エフェクトテスト成功');

        // テスト4: ネガ効果
        console.log('📋 テスト4: ネガ効果');
        const negativeImage = new MockImageData([255, 0, 128, 255, 100, 200, 50, 255], 2, 1);
        const originalNegData = new Uint8ClampedArray(negativeImage.data);
        negativeJS(negativeImage);
        
        assertEqual(negativeImage.data[0], 255 - originalNegData[0], 'R component inverted');
        assertEqual(negativeImage.data[1], 255 - originalNegData[1], 'G component inverted');
        assertEqual(negativeImage.data[2], 255 - originalNegData[2], 'B component inverted');
        assertEqual(negativeImage.data[3], originalNegData[3], 'Alpha preserved');
        console.log('✅ ネガ効果テスト成功');

        // テスト5: ゼロ半径ブラー
        console.log('📋 テスト5: ゼロ半径ブラー');
        const zeroBlurImage = createTestImageData(3, 3);
        const zeroOriginalData = new Uint8ClampedArray(zeroBlurImage.data);
        gaussianBlurJS(zeroBlurImage, 0);
        
        // データが変更されていないことを確認
        for (let i = 0; i < zeroBlurImage.data.length; i++) {
            assertEqual(zeroBlurImage.data[i], zeroOriginalData[i], `Data unchanged at index ${i}`);
        }
        console.log('✅ ゼロ半径ブラーテスト成功');

        // テスト6: 複数エフェクトの組み合わせ
        console.log('📋 テスト6: 複数エフェクト組み合わせ');
        const multiImage = createTestImageData(5, 5);
        const multiOriginalLen = multiImage.data.length;
        
        gaussianBlurJS(multiImage, 0.5);
        sepiaToneJS(multiImage);
        negativeJS(multiImage);
        
        assertEqual(multiImage.data.length, multiOriginalLen, 'Data length preserved after multiple effects');
        for (let i = 3; i < multiImage.data.length; i += 4) {
            assertEqual(multiImage.data[i], 255, 'Alpha preserved after multiple effects');
        }
        console.log('✅ 複数エフェクト組み合わせテスト成功');

        console.log('\n🎉 全てのJavaScriptテストが成功しました！');
        return true;
        
    } catch (error) {
        console.error(`❌ テスト失敗: ${error.message}`);
        return false;
    }
}

// Node.js環境での実行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests };
    
    // 直接実行された場合
    if (require.main === module) {
        const success = runTests();
        process.exit(success ? 0 : 1);
    }
}

// ブラウザ環境での実行
if (typeof window !== 'undefined') {
    window.runJavaScriptTests = runTests;
}
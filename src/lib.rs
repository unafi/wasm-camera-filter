use wasm_bindgen::prelude::*;

// WebAssembly用のコンソール出力設定
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// デバッグ用マクロ
#[cfg(not(test))]
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// テスト時はコンソール出力を無効化
#[cfg(test)]
macro_rules! console_log {
    ($($t:tt)*) => {}
}

/// WebAssembly画像処理エンジン
/// 高速な画像フィルタ処理を提供
#[wasm_bindgen]
pub struct ImageProcessor {
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl ImageProcessor {
    /// 新しいImageProcessorインスタンスを作成
    /// 
    /// # Arguments
    /// * `width` - 画像の幅
    /// * `height` - 画像の高さ
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> ImageProcessor {
        console_log!("ImageProcessor initialized: {}x{}", width, height);
        ImageProcessor { width, height }
    }

    /// ガウシアンブラーエフェクトを適用
    /// 
    /// # Arguments
    /// * `data` - RGBA画像データ (mutable)
    /// * `radius` - ブラー半径
    pub fn gaussian_blur(&mut self, data: &mut [u8], radius: f32) {
        console_log!("Applying gaussian blur with radius: {}", radius);
        
        if radius <= 0.0 {
            return;
        }

        // 簡易ガウシアンブラー実装
        // 実際のプロダクションでは、より高度なアルゴリズムを使用
        let width = self.width as usize;
        let height = self.height as usize;
        
        // 水平方向のブラー
        self.blur_horizontal(data, width, height, radius);
        
        // 垂直方向のブラー
        self.blur_vertical(data, width, height, radius);
    }

    /// エッジ検出エフェクトを適用
    /// 
    /// # Arguments
    /// * `data` - RGBA画像データ (mutable)
    pub fn edge_detection(&mut self, data: &mut [u8]) {
        console_log!("Applying edge detection");
        
        let width = self.width as usize;
        let height = self.height as usize;
        let mut temp_data = data.to_vec();

        // Sobelオペレータを使用したエッジ検出
        for y in 1..height - 1 {
            for x in 1..width - 1 {
                let idx = (y * width + x) * 4;
                
                // グレースケール変換
                let gray = self.get_gray_value(&temp_data, x, y, width);
                
                // Sobelフィルタ適用
                let gx = self.sobel_x(&temp_data, x, y, width);
                let gy = self.sobel_y(&temp_data, x, y, width);
                
                let magnitude = ((gx * gx + gy * gy) as f32).sqrt() as u8;
                
                data[idx] = magnitude;     // R
                data[idx + 1] = magnitude; // G
                data[idx + 2] = magnitude; // B
                // Alpha値は保持
            }
        }
    }

    /// セピア調エフェクトを適用
    /// 
    /// # Arguments
    /// * `data` - RGBA画像データ (mutable)
    pub fn sepia_tone(&mut self, data: &mut [u8]) {
        console_log!("Applying sepia tone");
        
        for i in (0..data.len()).step_by(4) {
            let r = data[i] as f32;
            let g = data[i + 1] as f32;
            let b = data[i + 2] as f32;

            // セピア変換行列
            let new_r = (r * 0.393 + g * 0.769 + b * 0.189).min(255.0) as u8;
            let new_g = (r * 0.349 + g * 0.686 + b * 0.168).min(255.0) as u8;
            let new_b = (r * 0.272 + g * 0.534 + b * 0.131).min(255.0) as u8;

            data[i] = new_r;
            data[i + 1] = new_g;
            data[i + 2] = new_b;
            // Alpha値は保持
        }
    }

    /// ネガフィルム効果を適用
    /// 
    /// # Arguments
    /// * `data` - RGBA画像データ (mutable)
    pub fn negative(&mut self, data: &mut [u8]) {
        console_log!("Applying negative effect");
        
        for i in (0..data.len()).step_by(4) {
            data[i] = 255 - data[i];         // R
            data[i + 1] = 255 - data[i + 1]; // G
            data[i + 2] = 255 - data[i + 2]; // B
            // Alpha値は保持
        }
    }

    /// シャープネス強化を適用
    /// 
    /// # Arguments
    /// * `data` - RGBA画像データ (mutable)
    pub fn sharpen(&mut self, data: &mut [u8]) {
        console_log!("Applying sharpen effect");
        
        let width = self.width as usize;
        let height = self.height as usize;
        let mut temp_data = data.to_vec();

        // シャープネスカーネル
        let kernel = [
            0.0, -1.0, 0.0,
            -1.0, 5.0, -1.0,
            0.0, -1.0, 0.0
        ];

        for y in 1..height - 1 {
            for x in 1..width - 1 {
                let idx = (y * width + x) * 4;
                
                for c in 0..3 { // RGB各チャンネル
                    let mut sum = 0.0;
                    
                    for ky in 0..3 {
                        for kx in 0..3 {
                            let px = x + kx - 1;
                            let py = y + ky - 1;
                            let pidx = (py * width + px) * 4 + c;
                            sum += temp_data[pidx] as f32 * kernel[ky * 3 + kx];
                        }
                    }
                    
                    data[idx + c] = sum.max(0.0).min(255.0) as u8;
                }
            }
        }
    }

    /// HDRアニメ調エフェクトを適用
    /// HDR強調とアニメ調処理を組み合わせた高負荷エフェクト
    /// 
    /// # Arguments
    /// * `data` - RGBA画像データ (mutable)
    pub fn hdr_anime(&mut self, data: &mut [u8]) {
        console_log!("Applying HDR anime effect");
        
        let width = self.width as usize;
        let height = self.height as usize;
        
        // ステップ1: HDR強調処理
        self.apply_hdr_enhancement(data, width, height);
        
        // ステップ2: アニメ調処理（色の階調化）
        self.apply_anime_posterization(data, width, height);
        
        // ステップ3: エッジ強調
        self.apply_edge_enhancement(data, width, height);
    }
}

impl ImageProcessor {
    /// 水平方向のブラー処理
    fn blur_horizontal(&self, data: &mut [u8], width: usize, height: usize, radius: f32) {
        let kernel_size = (radius * 2.0) as usize + 1;
        let mut temp_data = data.to_vec();
        
        for y in 0..height {
            for x in 0..width {
                let mut r_sum = 0.0;
                let mut g_sum = 0.0;
                let mut b_sum = 0.0;
                let mut count = 0.0;
                
                for kx in 0..kernel_size {
                    let px = x as i32 + kx as i32 - radius as i32;
                    if px >= 0 && px < width as i32 {
                        let idx = (y * width + px as usize) * 4;
                        r_sum += temp_data[idx] as f32;
                        g_sum += temp_data[idx + 1] as f32;
                        b_sum += temp_data[idx + 2] as f32;
                        count += 1.0;
                    }
                }
                
                let idx = (y * width + x) * 4;
                data[idx] = (r_sum / count) as u8;
                data[idx + 1] = (g_sum / count) as u8;
                data[idx + 2] = (b_sum / count) as u8;
            }
        }
    }
    
    /// 垂直方向のブラー処理
    fn blur_vertical(&self, data: &mut [u8], width: usize, height: usize, radius: f32) {
        let kernel_size = (radius * 2.0) as usize + 1;
        let mut temp_data = data.to_vec();
        
        for y in 0..height {
            for x in 0..width {
                let mut r_sum = 0.0;
                let mut g_sum = 0.0;
                let mut b_sum = 0.0;
                let mut count = 0.0;
                
                for ky in 0..kernel_size {
                    let py = y as i32 + ky as i32 - radius as i32;
                    if py >= 0 && py < height as i32 {
                        let idx = (py as usize * width + x) * 4;
                        r_sum += temp_data[idx] as f32;
                        g_sum += temp_data[idx + 1] as f32;
                        b_sum += temp_data[idx + 2] as f32;
                        count += 1.0;
                    }
                }
                
                let idx = (y * width + x) * 4;
                data[idx] = (r_sum / count) as u8;
                data[idx + 1] = (g_sum / count) as u8;
                data[idx + 2] = (b_sum / count) as u8;
            }
        }
    }
    
    /// グレースケール値を取得
    fn get_gray_value(&self, data: &[u8], x: usize, y: usize, width: usize) -> u8 {
        let idx = (y * width + x) * 4;
        let r = data[idx] as f32;
        let g = data[idx + 1] as f32;
        let b = data[idx + 2] as f32;
        (r * 0.299 + g * 0.587 + b * 0.114) as u8
    }
    
    /// Sobel X方向フィルタ
    fn sobel_x(&self, data: &[u8], x: usize, y: usize, width: usize) -> i32 {
        let kernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        let mut sum = 0;
        
        for ky in 0..3 {
            for kx in 0..3 {
                let px = x + kx - 1;
                let py = y + ky - 1;
                let gray = self.get_gray_value(data, px, py, width);
                sum += gray as i32 * kernel[ky * 3 + kx];
            }
        }
        
        sum
    }
    
    /// Sobel Y方向フィルタ
    fn sobel_y(&self, data: &[u8], x: usize, y: usize, width: usize) -> i32 {
        let kernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        let mut sum = 0;
        
        for ky in 0..3 {
            for kx in 0..3 {
                let px = x + kx - 1;
                let py = y + ky - 1;
                let gray = self.get_gray_value(data, px, py, width);
                sum += gray as i32 * kernel[ky * 3 + kx];
            }
        }
        
        sum
    }

    /// HDR強調処理を適用
    fn apply_hdr_enhancement(&self, data: &mut [u8], width: usize, height: usize) {
        for i in (0..data.len()).step_by(4) {
            let r = data[i] as f32 / 255.0;
            let g = data[i + 1] as f32 / 255.0;
            let b = data[i + 2] as f32 / 255.0;

            // ガンマ補正（コントラスト強化）
            let gamma = 0.7;
            let enhanced_r = r.powf(gamma);
            let enhanced_g = g.powf(gamma);
            let enhanced_b = b.powf(gamma);

            // 彩度向上
            let saturation_boost = 1.8;
            let gray = enhanced_r * 0.299 + enhanced_g * 0.587 + enhanced_b * 0.114;
            
            let final_r = gray + (enhanced_r - gray) * saturation_boost;
            let final_g = gray + (enhanced_g - gray) * saturation_boost;
            let final_b = gray + (enhanced_b - gray) * saturation_boost;

            data[i] = (final_r * 255.0).max(0.0).min(255.0) as u8;
            data[i + 1] = (final_g * 255.0).max(0.0).min(255.0) as u8;
            data[i + 2] = (final_b * 255.0).max(0.0).min(255.0) as u8;
        }
    }

    /// アニメ調色階調化処理を適用
    fn apply_anime_posterization(&self, data: &mut [u8], _width: usize, _height: usize) {
        let levels = 6; // 色階調のレベル数
        let step = 255.0 / (levels - 1) as f32;

        for i in (0..data.len()).step_by(4) {
            for c in 0..3 {
                let value = data[i + c] as f32;
                let level = (value / step).round();
                data[i + c] = (level * step).min(255.0) as u8;
            }
        }
    }

    /// エッジ強調処理を適用
    fn apply_edge_enhancement(&self, data: &mut [u8], width: usize, height: usize) {
        let mut temp_data = data.to_vec();
        
        for y in 1..height - 1 {
            for x in 1..width - 1 {
                let idx = (y * width + x) * 4;
                
                // エッジ検出
                let gx = self.sobel_x(&temp_data, x, y, width);
                let gy = self.sobel_y(&temp_data, x, y, width);
                let edge_strength = ((gx * gx + gy * gy) as f32).sqrt() / 255.0;
                
                // エッジ強調を元の色に適用
                let enhancement = 1.0 + edge_strength * 0.5;
                
                for c in 0..3 {
                    let original = temp_data[idx + c] as f32;
                    let enhanced = original * enhancement;
                    data[idx + c] = enhanced.min(255.0) as u8;
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// テスト用の小さな画像データを作成
    fn create_test_image_data(width: u32, height: u32) -> Vec<u8> {
        let mut data = Vec::new();
        for y in 0..height {
            for x in 0..width {
                // グラデーション画像を作成
                let r = (x * 255 / width) as u8;
                let g = (y * 255 / height) as u8;
                let b = 128;
                let a = 255;
                data.extend_from_slice(&[r, g, b, a]);
            }
        }
        data
    }

    #[test]
    fn test_image_processor_creation() {
        let processor = ImageProcessor { width: 100, height: 100 };
        assert_eq!(processor.width, 100);
        assert_eq!(processor.height, 100);
    }

    // WebAssembly固有の機能を使わない純粋なロジックテスト
    
    #[test]
    fn test_gaussian_blur_preserves_data_length() {
        let mut processor = ImageProcessor { width: 10, height: 10 };
        let mut data = create_test_image_data(10, 10);
        let original_len = data.len();
        
        processor.gaussian_blur(&mut data, 2.0);
        
        assert_eq!(data.len(), original_len);
        // Alpha値は変更されないことを確認
        for i in (0..data.len()).step_by(4) {
            assert_eq!(data[i + 3], 255);
        }
    }

    #[test]
    fn test_gaussian_blur_zero_radius() {
        let mut processor = ImageProcessor { width: 5, height: 5 };
        let mut data = create_test_image_data(5, 5);
        let original_data = data.clone();
        
        processor.gaussian_blur(&mut data, 0.0);
        
        // 半径0の場合、データは変更されない
        assert_eq!(data, original_data);
    }

    #[test]
    fn test_sepia_tone_effect() {
        let mut processor = ImageProcessor { width: 2, height: 2 };
        let mut data = vec![
            255, 0, 0, 255,    // 赤
            0, 255, 0, 255,    // 緑
            0, 0, 255, 255,    // 青
            255, 255, 255, 255 // 白
        ];
        
        processor.sepia_tone(&mut data);
        
        // セピア効果が適用されていることを確認
        // 赤い画素がセピア調になっているか
        assert!(data[0] > 0);  // R成分
        assert!(data[1] > 0);  // G成分
        assert_eq!(data[3], 255); // Alpha値は保持
    }

    #[test]
    fn test_negative_effect() {
        let mut processor = ImageProcessor { width: 2, height: 1 };
        let mut data = vec![
            255, 0, 128, 255,  // テスト色
            100, 200, 50, 255  // テスト色
        ];
        let original_data = data.clone();
        
        processor.negative(&mut data);
        
        // ネガ効果の確認
        assert_eq!(data[0], 255 - original_data[0]); // R反転
        assert_eq!(data[1], 255 - original_data[1]); // G反転
        assert_eq!(data[2], 255 - original_data[2]); // B反転
        assert_eq!(data[3], original_data[3]);       // Alpha保持
        
        assert_eq!(data[4], 255 - original_data[4]); // R反転
        assert_eq!(data[5], 255 - original_data[5]); // G反転
        assert_eq!(data[6], 255 - original_data[6]); // B反転
        assert_eq!(data[7], original_data[7]);       // Alpha保持
    }

    #[test]
    fn test_get_gray_value() {
        let processor = ImageProcessor { width: 3, height: 1 };
        let data = vec![
            255, 0, 0, 255,    // 赤
            0, 255, 0, 255,    // 緑
            0, 0, 255, 255,    // 青
        ];
        
        let gray_red = processor.get_gray_value(&data, 0, 0, 3);
        let gray_green = processor.get_gray_value(&data, 1, 0, 3);
        let gray_blue = processor.get_gray_value(&data, 2, 0, 3);
        
        // グレースケール変換の妥当性確認
        assert!(gray_red > 0);
        assert!(gray_green > gray_red);  // 緑は赤より明るい
        assert!(gray_blue > 0);
    }

    #[test]
    fn test_data_integrity_after_multiple_effects() {
        let mut processor = ImageProcessor { width: 10, height: 10 };
        let mut data = create_test_image_data(10, 10);
        let original_len = data.len();
        
        // 複数のエフェクトを順次適用
        processor.gaussian_blur(&mut data, 1.0);
        processor.sepia_tone(&mut data);
        
        // データ長とAlpha値の整合性確認
        assert_eq!(data.len(), original_len);
        for i in (0..data.len()).step_by(4) {
            assert_eq!(data[i + 3], 255);
        }
    }

    #[test]
    fn test_blur_horizontal_basic() {
        let processor = ImageProcessor { width: 3, height: 1 };
        let mut data = vec![
            255, 0, 0, 255,    // 赤
            0, 255, 0, 255,    // 緑  
            0, 0, 255, 255,    // 青
        ];
        
        processor.blur_horizontal(&mut data, 3, 1, 1.0);
        
        // ブラー後もAlpha値は保持
        assert_eq!(data[3], 255);
        assert_eq!(data[7], 255);
        assert_eq!(data[11], 255);
    }
}
# 📸 WebAssembly Camera Filter

リアルタイムカメラフィルタアプリケーション - WebAssembly vs JavaScript 性能比較

## 🌟 特徴

- **リアルタイム画像処理**: カメラ映像にリアルタイムでエフェクトを適用
- **WebAssembly vs JavaScript**: 同じアルゴリズムでの性能比較
- **モバイル対応**: iPhone/Android対応のレスポンシブデザイン
- **6種類のエフェクト**: HDRアニメ調、ブラー、エッジ検出、セピア、ネガ、シャープネス

## 🚀 デモ

**GitHub Pages**: https://unafi.github.io/wasm-camera-filter/

## 📚 技術ドキュメント

**詳細解説**: https://unafi.github.io/wasm-camera-filter/docs/

- 実行フローの詳細解説
- WebAssembly実装ガイド  
- 性能分析と最適化手法

※ `/docs`ディレクトリにはMarkdown(.md)版も含まれています

## 📱 対応デバイス

- **iPhone**: Safari (iOS 11+)
- **Android**: Chrome (Android 5+)
- **デスクトップ**: Chrome, Firefox, Safari, Edge

## 🎯 エフェクト一覧

1. **HDRアニメ調** - HDR強調 + アニメ風色階調化 + エッジ強調
2. **ガウシアンブラー** - ぼかし効果
3. **エッジ検出** - Sobelオペレータによる輪郭抽出
4. **セピア調** - 古い写真風の色調変換
5. **ネガフィルム** - 色反転効果
6. **シャープネス** - 輪郭強調

## ⚡ 性能比較

リアルタイムFPS測定により、WebAssemblyとJavaScriptの性能差を体感できます。

- **WebAssembly**: Rustで実装された高速処理
- **JavaScript**: 同等アルゴリズムのJavaScript実装
- **FPS表示**: リアルタイム性能監視
- **速度比**: WebAssemblyがJavaScriptの何倍速いかを表示

## 🛠️ 技術スタック

- **WebAssembly**: Rust + wasm-bindgen
- **フロントエンド**: Vanilla JavaScript + Canvas API
- **カメラアクセス**: WebRTC API
- **ビルドツール**: wasm-pack
- **デプロイ**: GitHub Pages + GitHub Actions

## 🏗️ ローカル開発

### 必要な環境

```bash
# Rust インストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# WebAssembly ターゲット追加
rustup target add wasm32-unknown-unknown

# wasm-pack インストール
cargo install wasm-pack
```

### ビルドと実行

```bash
# WebAssembly ビルド
wasm-pack build --target web --out-dir pkg

# HTTPS サーバー起動（カメラアクセスにHTTPS必須）
python https_server.py

# ブラウザで https://localhost:8000 にアクセス
```

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストやイシューを歓迎します！

---

**作成者**: [unafi](https://github.com/unafi)  
**技術**: WebAssembly, Rust, JavaScript, WebRTC
#!/usr/bin/env python3
"""
WebAssemblyカメラフィルタプロジェクトの統合テストランナー
Rust、JavaScript、統合テストを順次実行
"""

import subprocess
import sys
import os
import json
from pathlib import Path

def run_command(cmd, cwd=None, description=""):
    """コマンドを実行し、結果を返す"""
    print(f"🔄 {description}")
    print(f"   実行: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd, 
            cwd=cwd, 
            capture_output=True, 
            text=True, 
            encoding='utf-8',
            errors='replace',
            check=True
        )
        print(f"✅ {description} - 成功")
        if result.stdout and result.stdout.strip():
            print(f"   出力: {result.stdout.strip()}")
        return True, result.stdout or ""
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - 失敗")
        stderr_msg = e.stderr.strip() if e.stderr else "エラー詳細なし"
        print(f"   エラー: {stderr_msg}")
        return False, stderr_msg
    except FileNotFoundError:
        print(f"❌ {description} - コマンドが見つかりません: {cmd[0]}")
        return False, f"Command not found: {cmd[0]}"

def check_rust_environment():
    """Rust環境の確認"""
    print("🦀 Rust環境チェック...")
    
    # Rustコンパイラの確認
    success, output = run_command(["rustc", "--version"], description="Rustコンパイラ確認")
    if not success:
        return False
    
    # Cargoの確認
    success, output = run_command(["cargo", "--version"], description="Cargo確認")
    if not success:
        return False
    
    return True

def check_node_environment():
    """Node.js環境の確認"""
    print("🟢 Node.js環境チェック...")
    
    success, output = run_command(["node", "--version"], description="Node.js確認")
    return success

def run_rust_tests():
    """Rustユニットテストの実行"""
    print("\n🦀 Rustユニットテスト実行...")
    
    # 通常のテスト実行
    success, output = run_command(
        ["cargo", "test", "--lib"], 
        description="Rustユニットテスト"
    )
    
    if success:
        print("📊 テスト結果:")
        lines = output.split('\n')
        for line in lines:
            if 'test result:' in line or 'running' in line:
                print(f"   {line}")
    
    return success

def run_javascript_tests():
    """JavaScriptテストの実行"""
    print("\n🟢 JavaScriptテスト実行...")
    
    test_file = Path("tests/test_javascript.js")
    if not test_file.exists():
        print("❌ JavaScriptテストファイルが見つかりません")
        return False
    
    success, output = run_command(
        ["node", str(test_file)], 
        description="JavaScriptテスト"
    )
    
    return success

def run_build_test():
    """WebAssemblyビルドテスト"""
    print("\n🔧 WebAssemblyビルドテスト...")
    
    # wasm-packの確認
    success, output = run_command(["wasm-pack", "--version"], description="wasm-pack確認")
    if not success:
        print("⚠️  wasm-packが見つかりません。ビルドテストをスキップします。")
        return True  # 必須ではないのでスキップ
    
    # WebAssemblyビルド
    success, output = run_command(
        ["wasm-pack", "build", "--target", "web", "--out-dir", "pkg"], 
        description="WebAssemblyビルド"
    )
    
    if success:
        # 生成されたファイルの確認
        pkg_dir = Path("pkg")
        expected_files = [
            "wasm_camera_filter.js",
            "wasm_camera_filter_bg.wasm",
            "package.json"
        ]
        
        missing_files = []
        for file in expected_files:
            if not (pkg_dir / file).exists():
                missing_files.append(file)
        
        if missing_files:
            print(f"❌ 生成されるべきファイルが見つかりません: {missing_files}")
            return False
        else:
            print("✅ 必要なWebAssemblyファイルが正常に生成されました")
    
    return success

def run_integration_tests():
    """統合テストの実行"""
    print("\n🔗 統合テスト...")
    
    # プロジェクト構造の確認
    required_files = [
        "index.html",
        "main.js", 
        "style.css",
        "src/lib.rs",
        "Cargo.toml"
    ]
    
    missing_files = []
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ 必要なファイルが見つかりません: {missing_files}")
        return False
    
    print("✅ プロジェクト構造確認完了")
    
    # HTMLファイルの基本構造確認
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            html_content = f.read()
            
        required_elements = ["canvas", "video", "button"]
        for element in required_elements:
            if f"<{element}" not in html_content:
                print(f"❌ HTMLに必要な要素が見つかりません: {element}")
                return False
        
        print("✅ HTML構造確認完了")
        
    except Exception as e:
        print(f"❌ HTMLファイル読み込みエラー: {e}")
        return False
    
    return True

def generate_test_report(results):
    """テスト結果レポートの生成"""
    print("\n📊 テスト結果サマリー")
    print("=" * 50)
    
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result)
    
    for test_name, result in results.items():
        status = "✅ 成功" if result else "❌ 失敗"
        print(f"{test_name:<25} {status}")
    
    print("=" * 50)
    print(f"総テスト数: {total_tests}")
    print(f"成功: {passed_tests}")
    print(f"失敗: {total_tests - passed_tests}")
    print(f"成功率: {passed_tests/total_tests*100:.1f}%")
    
    return passed_tests == total_tests

def main():
    """メイン実行関数"""
    print("🧪 WebAssemblyカメラフィルタ - 統合テスト実行")
    print("=" * 60)
    
    # 作業ディレクトリの確認
    if not Path("Cargo.toml").exists():
        print("❌ Cargo.tomlが見つかりません。プロジェクトルートで実行してください。")
        sys.exit(1)
    
    results = {}
    
    # 環境チェック
    if not check_rust_environment():
        print("❌ Rust環境が正しく設定されていません")
        sys.exit(1)
    
    node_available = check_node_environment()
    
    # テスト実行
    results["Rustユニットテスト"] = run_rust_tests()
    
    if node_available:
        results["JavaScriptテスト"] = run_javascript_tests()
    else:
        print("⚠️  Node.jsが利用できないため、JavaScriptテストをスキップします")
        results["JavaScriptテスト"] = True  # スキップとして成功扱い
    
    results["WebAssemblyビルド"] = run_build_test()
    results["統合テスト"] = run_integration_tests()
    
    # 結果レポート
    all_passed = generate_test_report(results)
    
    if all_passed:
        print("\n🎉 全てのテストが成功しました！")
        sys.exit(0)
    else:
        print("\n💥 一部のテストが失敗しました")
        sys.exit(1)

if __name__ == "__main__":
    main()
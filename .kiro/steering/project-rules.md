---
inclusion: always
---

# プロジェクトルール

このプロジェクトでは以下のルールとガイドラインに従ってください：

## 日本語使用ルール

このプロジェクトでは、ユーザーとの対話とドキュメント作成において日本語を使用します。

### 適用範囲
- ユーザーとの対話
- ドキュメント作成
- コメント記述

### 例外
- コード内の変数名、関数名は英語を使用
- 技術的な専門用語は必要に応じて英語併記

## コードドキュメント標準

### 関数・メソッドコメント（TypeScript）
```typescript
/**
 * ユーザー認証を実行する
 * @param email - ユーザーのメールアドレス
 * @param password - パスワード
 * @returns 認証結果とトークン
 * @throws AuthenticationError 認証失敗時
 */
async function authenticateUser(email: string, password: string): Promise<AuthResult> {
    // 実装
}
```

### クラスコメント（TypeScript）
```typescript
/**
 * ユーザー管理クラス
 * データベースとのやり取りとビジネスロジックを担当
 */
export class UserManager {
    /**
     * ユーザーを作成する
     * @param userData - ユーザー作成データ
     * @returns 作成されたユーザー情報
     */
    async createUser(userData: CreateUserData): Promise<User> {
        // 実装
    }
}
```

### インターフェース・型定義コメント
```typescript
/**
 * ユーザー認証結果の型定義
 */
export interface AuthResult {
    /** 認証トークン */
    token: string;
    /** ユーザー情報 */
    user: User;
    /** トークンの有効期限 */
    expiresAt: Date;
}

/**
 * クラウドリソースの型定義
 */
export type CloudResource = {
    /** リソースID */
    id: string;
    /** リソース名 */
    name: string;
    /** サービスタイプ */
    type: string;
    /** 稼働状況 */
    status: string;
};
```

### インラインコメント
```typescript
// 複雑なロジックの説明
const result = data
    .filter(item => item.status === 'active') // アクティブなアイテムのみ
    .map(item => transformData(item))         // データ変換
    .sort((a, b) => a.priority - b.priority); // 優先度順でソート
```

### Kiro ガイドライン
1. 全ての関数にJSDocコメントを追加
2. 複雑なロジックにはインラインコメントを追加
3. クラスと重要な変数に説明コメントを追加
4. TODOやFIXMEには課題番号を含める

## Gitワークフロー標準

### ブランチ命名規則
- `main`: 本番環境用の安定版
- `dev`: 開発統合ブランチ
- `feature/<機能名>`: 新機能開発
- `bugfix/<バグ修正名>`: バグ修正
- `hotfix/<緊急修正名>`: 本番緊急修正

### コミットメッセージ規則
```
<type>(<scope>): <subject>

<body>

<footer>
```

#### タイプ
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: コードフォーマット
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド・設定変更

#### コミットメッセージ例
```
feat(auth): ユーザー認証機能を追加

- JWT トークンベースの認証を実装
- ログイン・ログアウト機能を追加
- セッション管理を実装

Closes #123
```

```
fix(api): AWSリソース取得時のエラーハンドリングを修正

- 権限不足エラーの適切な処理を追加
- タイムアウト時のリトライ機能を実装

Fixes #456
```

### マージ戦略
- `dev` ← フィーチャーブランチ: Squash and merge
- `main` ← `dev`: Merge commit
- `main` ← `hotfix`: Merge commit


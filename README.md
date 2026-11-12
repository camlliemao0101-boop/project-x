# PROJECT X · HRBP AI 文案改写器

第三个独立工具。HRBP 生成逐页文案，带入配套编辑器核对，再导出员工阅读版。原 GitHub Pages 的员工阅读版与 HRBP 编辑器继续从 `main` 发布。

[在 Render 部署](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fcamlliemao0101-boop%2Fproject-x%2Ftree%2Fcodex%2Fproject-x-ai)

1. 登录 Render，打开上面的部署入口。使用配置中指定的免费实例。
2. 在 Render 的环境变量表单填入 `DASHSCOPE_API_KEY`，使用华北 2（北京）的阿里云百炼密钥。不要把密钥提交到 GitHub。
3. 在自己的 PowerShell 里执行以下命令生成一串随机字符，把结果填到 `PROJECT_X_ACCESS_TOKEN`。

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

4. 等 Render 显示部署成功。复制服务的 HTTPS 地址，在地址后加上 `/#access=` 和刚才生成的随机字符。先用虚拟案例测试生成、带入编辑器和导出，再转发完整链接给 HRBP。分享的是这串访问凭证，百炼密钥只留在后台。

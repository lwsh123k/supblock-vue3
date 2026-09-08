# elliptic 6.6.1 补丁

保留 ethers 5，修复 [CVE-2025-14505](https://github.com/advisories/GHSA-848j-6mx2-7j84)。采用上游公开 [PR #345](https://github.com/indutny/elliptic/pull/345) 的相同逻辑；该 PR 尚未合并，本补丁不是上游发布的新版本。

仅保留默认 DRBG 输出的原始字节数组，使 nonce `k` 的前导零参与长度计算；自定义 `options.k` 保持原有行为。`package.json` 中的 `pnpm.patchedDependencies` 会让普通 `pnpm install` 自动应用补丁。

验证记录：披露者的 [1,560 条 P-521/SHA-512 向量](https://github.com/bleichenbacher-daniel/Rooterberg/blob/main/test_vectors/ecdsa/ecdsa_rfc6979_secp521r1_sha_512.json)由原版 7 条不匹配变为全部匹配；[RFC 6979 附录 A.2.7](https://www.rfc-editor.org/rfc/rfc6979.html#appendix-A.2.7) 的 10 条标准向量通过；1,024 次 secp256k1 合成签名对比的签名及恢复参数与原版一致。

安装后运行 `node scripts/check-elliptic-patch.cjs`，可检查实际安装包的两条 P-521 回归向量，以及 ethers 5 消息、交易签名是否保持兼容；测试仅使用公开向量和合成密钥，不发送交易。

包版本仍为 6.6.1，按版本匹配的 `pnpm audit` / Dependabot 可能继续报告同一告警；本补丁针对上述 nonce 长度错误。

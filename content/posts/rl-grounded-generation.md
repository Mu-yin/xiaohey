---
{"id":"rl-grounded-generation","typeKey":"paper","title":"从检索到生成：RAG 系统的三层评估框架","eyebrow":"AI · Knowledge Systems","date":"2026.08.12","readTime":"12 分钟","level":"进阶","tags":["RAG","评估","LLM"],"abstract":"把 RAG 拆成检索质量、上下文利用与答案忠实度三层，建立一套能定位问题、而非只给总分的评估方法。","takeaway":"评估的价值不在于得到一个漂亮分数，而在于知道下一次实验该改哪里。","accent":"green","index":"P—01","featured":false,"status":"published","coverImage":"","attachments":[],"citation":"xiaohey. (2026). 从检索到生成：RAG 系统的三层评估框架. xiaohey 学习与研究博客."}
---

## 为什么单一指标不够

RAG 是一个串联系统。检索错误、上下文噪声与模型幻觉会在最终答案里表现得很相似，仅看答案正确率无法判断瓶颈来自哪一环。

## 三层指标

第一层检查召回与排序；第二层检查模型是否使用了关键上下文；第三层检查主张是否能被上下文支持。三层分开记录，才能形成可行动的诊断。

## 我的实践清单

先固定问题集与语料版本，再为每个失败样本标注错误来源。每轮实验只改变一个变量，并保存检索片段、提示词与答案快照。

---
{"id":"python-research-kit","typeKey":"resource","title":"可复现研究的 Python 项目模板与检查表","eyebrow":"TOOLKIT · REPRODUCIBILITY","date":"2026.07.21","readTime":"6 分钟","level":"实用","tags":["Python","研究工具","复现"],"abstract":"目录结构、环境锁定、随机种子、数据字典与实验日志：把“在我电脑上能跑”变成可复现成果。","takeaway":"复现不是论文完成后的清理工作，而是研究过程本身的一部分。","accent":"slate","index":"T—05","featured":false,"status":"published","coverImage":"","attachments":[],"citation":"xiaohey. (2026). 可复现研究的 Python 项目模板与检查表. xiaohey 学习与研究博客."}
---

## 项目骨架

把原始数据、处理中间件、分析代码与输出结果分开。原始数据只读，所有图表都应能从脚本重新生成。

## 环境与参数

锁定依赖版本，把实验参数写入配置文件，记录随机种子与运行时间。不要依赖 Notebook 中不可见的执行顺序。

## 交付前检查

在干净环境运行全部流程；检查绝对路径；补充数据字典；为关键结论标记对应代码与输入版本。

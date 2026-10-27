# OpenLab

面向高中化学的引导式 3D 虚拟实验，共 12 节课，分两组。

**学生必做实验**

- 配制一定物质的量浓度的溶液
- 铁及其化合物的性质
- 用化学沉淀法去除粗盐中的杂质离子
- 化学能转化成电能
- 化学反应速率的影响因素
- 强酸与强碱的中和滴定

**演示与拓展实验**（有毒、危险或学校里难以动手做的实验）

- 氯气的实验室制法
- 钠与水的反应
- 铝热反应
- 氨的喷泉实验
- 乙炔的实验室制法与性质
- 电解氯化铜溶液

技术栈：Vite + React + TypeScript + Tailwind CSS + shadcn/ui，3D 用 React Three Fiber + drei。所有器材都是程序化建模，没有外部模型文件。

## 运行

```bash
npm install
npm run dev     # 开发
npm test        # 反应引擎、滴定、容器形状的单元测试
npm run build   # 构建到 dist/
```

## 结构

| 路径 | 作用 |
| --- | --- |
| `src/chem/engine.ts` | 反应规则引擎：试剂、规则表、倾倒/过滤/蒸发、外观 |
| `src/chem/titration.ts` | 强酸强碱滴定的 pH 曲线和酚酞变色 |
| `src/kit/shapes.ts` | 容器内腔形状，体积与液面高度换算 |
| `src/kit/vessel.tsx` | 通用玻璃容器：液面随体积变化，液体用水平裁剪面渲染，倾斜时保持水平 |
| `src/kit/apparatus.tsx` | 器材：滴瓶、天平、漏斗、酒精灯、滴定管、电流表、电极等 |
| `src/kit/lab2.tsx` | 气体装置（分液漏斗、洗气瓶、导管）、电源、碳棒、钠、铝热、喷泉等器材与特效 |
| `src/kit/carry.tsx` | 取用、滴加、倾倒、搅拌、蘸取等动画 |
| `src/lessons/*.tsx` | 每节课一个文件：场景布局 + 步骤数据 |
| `src/Player.tsx` | 通用课程播放器：操作步骤、选择题、连续控制三种步骤 |

## 新增一节课

1. 需要新的化学反应时，在 `engine.ts` 里加试剂、规则和外观，并在 `engine.test.ts` 里写测试。
2. 在 `src/lessons/` 下新建课程文件，导出一个 `Lesson`：`group` 决定首页分组，`items` 是可点击物体的名字，`steps` 是步骤，`Scene` 摆放器材并响应动画。随时间变化的现象（气体流动、颜色渐变）用时间戳记在 state 里，在 `look` / `volume` 函数中按当前时间计算。
3. 在 `src/lessons/index.ts` 里注册。

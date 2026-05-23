/**
 * LangGraph多Agent工作流
 * 实现五步串行AI短剧生成流程
 * 1. 大纲Agent → 2. 角色Agent → 3. 剧情结构Agent → 4. 剧本Agent → 5. 分镜提示词Agent
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { createLLM } = require('./llmFactory');
const logger = require('../config/logger');
const { config } = require('../config/env');

// 模块级变量 (LangGraph会序列化state，函数无法通过state传递)
let _progressCallback = null;
let _llmProvider = null;
let _llmOptions = {};

/**
 * 定义工作流状态结构
 */
class WorkflowState {
  constructor() {
    this.taskId = '';           // 任务ID
    this.userInput = {};        // 用户输入
    this.outline = '';          // 故事大纲
    this.characters = '';       // 人物角色
    this.structure = '';        // 剧情结构
    this.script = '';           // 完整剧本
    this.storyboard = '';       // 分镜提示词
    this.currentStep = 0;       // 当前步骤
    this.error = null;          // 错误信息
  }
}

/**
 * Agent 1: 故事大纲生成器
 * 根据用户输入生成完整的短剧故事大纲
 */
async function outlineAgent(state) {
  try {
    logger.logAgent(state.taskId, 'OutlineAgent', 'started');

    const llm = createLLM(_llmProvider, _llmOptions);
    const { theme, keywords, genre, style } = state.userInput;

    if (_progressCallback) {
      await _progressCallback(1, '正在生成故事大纲...');
    }

    const prompt = `你是一位资深的短剧策划大师。请根据以下信息创作一个吸引人的短剧故事大纲。

【用户需求】
- 题材: ${theme}
- 关键词: ${keywords}
- 类型: ${genre || '不限'}
- 风格: ${style || '不限'}

【任务要求】
1. 故事要有强烈的冲突和戏剧张力
2. 情节设置要有反转和悬念
3. 适合短剧形式(每集5-10分钟)
4. 第一集要有强烈的钩子引起观众兴趣

【输出格式】
# 短剧标题
(一个吸引人的标题)

## 核心概念
(用2-3句话概括故事核心)

## 主题与立意
(故事想要传达的核心主题)

## 故事背景
(时代背景、社会环境、世界观设定)

## 核心冲突
(主要矛盾和冲突点)

## 故事走向
(整体故事发展方向,预计集数)

请开始创作:`;

    const response = await llm.invoke(prompt);
    state.outline = response.content;
    state.currentStep = 1;

    if (_progressCallback) {
      await _progressCallback(1, state.outline);
    }

    logger.logAgent(state.taskId, 'OutlineAgent', 'completed');
    return state;
    
  } catch (error) {
    logger.logAgent(state.taskId, 'OutlineAgent', 'failed');
    state.error = error;
    throw error;
  }
}

/**
 * Agent 2: 人物角色设定器
 * 基于故事大纲设计主要角色
 */
async function charactersAgent(state) {
  try {
    logger.logAgent(state.taskId, 'CharactersAgent', 'started');

    const llm = createLLM(_llmProvider, _llmOptions);
    
    const prompt = `你是一位专业的角色设计师。请根据以下故事大纲,设计3-5个核心角色。

【故事大纲】
${state.outline}

【角色设计要求】
1. 每个角色要有鲜明的性格特点
2. 角色之间要有复杂的关系和互动
3. 主角要有成长弧线
4. 配角要能推动剧情发展

【输出格式】
对每个角色按以下结构描述:

## 角色1: [姓名](主角/配角)
- **基本信息**: 年龄、职业、身份
- **性格特征**: 3-5个关键词
- **外貌特征**: 简要描述
- **背景故事**: 重要的过往经历
- **角色动机**: TA想要什么/追求什么
- **角色弧线**: 在故事中如何成长变化
- **与其他角色的关系**: 关键人物关系

(重复上述格式描述所有角色)

请开始设计:`;

    if (_progressCallback) await _progressCallback(2, `正在生成角色设定...`);
    const response = await llm.invoke(prompt);
    state.characters = response.content;
    if (_progressCallback) await _progressCallback(2, state.characters);
    state.currentStep = 2;
    
    logger.logAgent(state.taskId, 'CharactersAgent', 'completed');
    return state;
    
  } catch (error) {
    logger.logAgent(state.taskId, 'CharactersAgent', 'failed');
    state.error = error;
    throw error;
  }
}

/**
 * Agent 3: 三幕式剧情结构设计器
 * 按照经典三幕式结构规划整体剧情
 */
async function structureAgent(state) {
  try {
    logger.logAgent(state.taskId, 'StructureAgent', 'started');

    const llm = createLLM(_llmProvider, _llmOptions);
    
    const prompt = `你是一位剧本结构大师。请基于已有的故事大纲和角色设定,设计三幕式剧情结构。

【故事大纲】
${state.outline}

【角色设定】
${state.characters}

【结构要求】
采用经典三幕式结构,适配短剧形式(预计8-12集)

【输出格式】

# 第一幕: 建立(Act 1 - Setup)
**集数**: 第1-3集
**核心任务**: 介绍世界观、主要角色、日常生活、引发事件

## 触发事件(Inciting Incident)
(是什么打破了主角的平静生活?)

## 第一集详细情节点
- 开场(0-2分钟): 
- 人物介绍(2-4分钟): 
- 冲突引入(4-6分钟): 
- 钩子结尾(6-8分钟): 

## 第2-3集概要
- 第2集: 
- 第3集: 

---

# 第二幕: 对抗(Act 2 - Confrontation)
**集数**: 第4-8集
**核心任务**: 主角追求目标、遭遇障碍、关系发展、中点反转

## 上升行动
(冲突如何升级?)

## 中点(Midpoint)
(故事中间的重大转折)

## 关键情节点
- 第4集: 
- 第5集: 
- 第6集: 
- 第7集: 
- 第8集: 

---

# 第三幕: 解决(Act 3 - Resolution)
**集数**: 第9-12集
**核心任务**: 高潮对决、真相揭示、矛盾解决、情感升华

## 最低点(All is Lost)
(主角跌入谷底)

## 高潮(Climax)
(最终对决/最大冲突)

## 结局(Resolution)
(故事如何收尾,留白or圆满?)

## 关键情节点
- 第9集: 
- 第10集: 
- 第11集: 
- 第12集(大结局): 

请开始设计:`;

    if (_progressCallback) await _progressCallback(3, `正在生成剧情结构...`);
    const response = await llm.invoke(prompt);
    state.structure = response.content;
    if (_progressCallback) await _progressCallback(3, state.structure);
    state.currentStep = 3;
    
    logger.logAgent(state.taskId, 'StructureAgent', 'completed');
    return state;
    
  } catch (error) {
    logger.logAgent(state.taskId, 'StructureAgent', 'failed');
    state.error = error;
    throw error;
  }
}

/**
 * Agent 4: 第一集完整剧本生成器
 * 生成第一集的详细分场剧本
 */
async function scriptAgent(state) {
  try {
    logger.logAgent(state.taskId, 'ScriptAgent', 'started');

    const llm = createLLM(_llmProvider, _llmOptions);
    
    const prompt = `你是一位专业的短剧编剧。请基于前期准备的所有内容,撰写第一集的完整分场剧本。

【故事大纲】
${state.outline}

【角色设定】
${state.characters}

【剧情结构】
${state.structure}

【剧本要求】
1. 标准分场剧本格式(场景、人物、对话、动作)
2. 时长控制在6-8分钟(约6-8个场次)
3. 第一场要强力抓住观众注意力
4. 结尾留下悬念或钩子引导下一集
5. 对话要自然、有冲突、推动剧情

【输出格式】

# 第一集: [集标题]

**集数**: 01
**时长**: 6-8分钟
**核心剧情**: (一句话概括本集)

---

## 场次1: [场景名称]
**时间**: 白天/夜晚
**地点**: 具体位置
**人物**: 在场角色
**氛围**: 场景氛围

[场景描述]
(用1-2句话描述场景的视觉呈现和氛围)

**[人物A]**: (动作描述)对话内容
**[人物B]**: (动作描述)对话内容

[动作描写]
(关键动作、表情、情绪变化)

---

(重复上述格式完成所有场次)

## 场次2-8
...

---

## 第一集总结
**关键信息传达**: 
**悬念设置**: 
**情感基调**: 

请开始创作第一集完整剧本:`;

    if (_progressCallback) await _progressCallback(4, `正在生成完整剧本...`);
    const response = await llm.invoke(prompt);
    state.script = response.content;
    if (_progressCallback) await _progressCallback(4, state.script);
    state.currentStep = 4;
    
    logger.logAgent(state.taskId, 'ScriptAgent', 'completed');
    return state;
    
  } catch (error) {
    logger.logAgent(state.taskId, 'ScriptAgent', 'failed');
    state.error = error;
    throw error;
  }
}

/**
 * Agent 5: 影视分镜表+AI绘图提示词生成器
 * 为第一集每个场次生成分镜描述和AI绘图提示词
 */
async function storyboardAgent(state) {
  try {
    logger.logAgent(state.taskId, 'StoryboardAgent', 'started');

    const llm = createLLM(_llmProvider, _llmOptions);
    
    const prompt = `你是一位专业的分镜师和AI绘图提示词专家。请基于第一集剧本,制作详细的影视分镜表和AI绘图提示词。

【第一集剧本】
${state.script}

【任务要求】
1. 为每个场次的关键镜头设计分镜
2. 每个场次提供2-4个关键镜头
3. 为每个镜头撰写英文AI绘图提示词(Midjourney/Stable Diffusion格式)
4. 提示词要包含:场景、人物、构图、光影、情绪、风格

【输出格式】

# 第一集分镜表

## 场次1: [场景名称]
**整体基调**: (视觉风格和情绪氛围)

### 镜头1-1: [镜头描述]
- **镜头类型**: 远景/全景/中景/特写/大特写
- **运镜方式**: 固定/推拉/摇移/跟随
- **构图**: 描述画面构图
- **时长**: X秒
- **作用**: 该镜头的叙事功能

**AI绘图提示词**:
\`\`\`
[English Prompt]: A cinematic [shot type] of [subject], [environment details], [lighting], [mood], [camera angle], [art style], highly detailed, 8k, professional photography
\`\`\`

---

(每个场次重复上述格式)

## 场次2-8
...

---

# 核心视觉元素总结
**色调**: 
**主要场景风格**: 
**角色视觉关键词**: 
**整体艺术风格**: 

请开始制作分镜表:`;

    if (_progressCallback) await _progressCallback(5, `正在生成分镜提示词...`);
    const response = await llm.invoke(prompt);
    state.storyboard = response.content;
    if (_progressCallback) await _progressCallback(5, state.storyboard);
    state.currentStep = 5;
    
    logger.logAgent(state.taskId, 'StoryboardAgent', 'completed');
    return state;
    
  } catch (error) {
    logger.logAgent(state.taskId, 'StoryboardAgent', 'failed');
    state.error = error;
    throw error;
  }
}

/**
 * 创建LangGraph工作流
 * @returns {Object} - 编译后的工作流图
 */
function createDramaWorkflow() {
  // 创建状态图
  const workflow = new StateGraph({
    channels: {
      taskId: null,
      userInput: null,
      outline: null,
      characters: null,
      structure: null,
      script: null,
      storyboard: null,
      currentStep: null,
      error: null
    }
  });

  // 添加节点(五个Agent)
  workflow.addNode('outline_node', outlineAgent);
  workflow.addNode('characters_node', charactersAgent);
  workflow.addNode('structure_node', structureAgent);
  workflow.addNode('script_node', scriptAgent);
  workflow.addNode('storyboard_node', storyboardAgent);

  // 设置入口
  workflow.setEntryPoint('outline_node');

  // 添加边(定义执行顺序)
  workflow.addEdge('outline_node', 'characters_node');
  workflow.addEdge('characters_node', 'structure_node');
  workflow.addEdge('structure_node', 'script_node');
  workflow.addEdge('script_node', 'storyboard_node');
  workflow.addEdge('storyboard_node', END);

  // 编译工作流
  return workflow.compile();
}

/**
 * 执行完整的短剧生成工作流
 * @param {string} taskId - 任务ID
 * @param {Object} userInput - 用户输入
 * @param {Function} progressCallback - 进度回调函数
 * @returns {Promise<Object>} - 生成结果
 */
async function executeDramaWorkflow(taskId, userInput, progressCallback, provider = null, llmOptions = {}) {
  const startTime = Date.now();

  try {
    logger.info('开始执行短剧生成工作流', {
      taskId,
      userInput,
      provider: provider || config.llm.provider
    });

    // 初始化状态
    const initialState = new WorkflowState();
    initialState.taskId = taskId;
    initialState.userInput = userInput;

    // 设置模块级变量
    _progressCallback = progressCallback;
    _llmProvider = provider;
    _llmOptions = llmOptions;

    // 创建工作流
    const app = createDramaWorkflow();

    // 执行工作流
    const result = await app.invoke(initialState);

    const executionTime = Date.now() - startTime;
    
    logger.info('短剧生成工作流执行完成', {
      taskId,
      executionTime: `${executionTime}ms`,
      steps: result.currentStep
    });

    return {
      success: true,
      result: {
        outline: result.outline,
        characters: result.characters,
        structure: result.structure,
        script: result.script,
        storyboard: result.storyboard
      },
      executionTime
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    logger.error('短剧生成工作流执行失败', {
      taskId,
      error: error.message,
      executionTime: `${executionTime}ms`
    });

    return {
      success: false,
      error: error.message,
      executionTime
    };
  }
}

/**
 * 续写下一集 — 基于已有剧情生成后续集的剧本和分镜
 * @param {string} taskId - 任务ID
 * @param {Object} context - 上下文（大纲、角色、结构、前集剧本）
 * @param {number} episodeNumber - 要生成的集数
 * @param {string} instruction - 用户额外指示
 * @param {string} provider - LLM厂商
 * @param {Object} llmOptions - LLM选项
 * @returns {Promise<Object>} - 生成结果
 */
async function executeEpisodeContinuation(taskId, context, episodeNumber, instruction, provider = null, llmOptions = {}) {
  const startTime = Date.now();

  try {
    logger.info('开始执行续写工作流', {
      taskId,
      episodeNumber,
      provider: provider || config.llm.provider
    });

    const llm = createLLM(provider, llmOptions);
    const previousScriptsText = context.previousScripts
      .map(ep => `【第${ep.episodeNumber}集剧本】\n${ep.script}`)
      .join('\n\n---\n\n');

    // Step 1: 生成剧本
    const scriptPrompt = `你是一位专业的短剧编剧。请基于以下完整剧情设定，撰写第${episodeNumber}集的完整分场剧本。

【故事大纲】
${context.outline}

【角色设定】
${context.characters}

【剧情结构】
${context.structure}

【前集剧本】
${previousScriptsText}

${instruction ? `【用户附加指示】\n${instruction}\n` : ''}

【续写要求】
1. 严格遵循已有的人物性格、故事主线和剧情结构
2. 保持与前集一致的风格、节奏和叙事手法
3. 承接上一集的结尾钩子或悬念
4. 时长控制在6-8分钟（约6-8个场次）
5. 本集要有完整的起承转合
6. 结尾设置新的悬念或钩子引导下一集
7. 对话要自然、推动剧情、展现人物性格

【输出格式】

# 第${episodeNumber}集: [集标题]

**集数**: ${String(episodeNumber).padStart(2, '0')}
**时长**: 6-8分钟
**接续上集**: （用1句话回顾上一集与本集的衔接点）
**核心剧情**: （一句话概括本集）

---

## 场次1: [场景名称]
**时间**: 白天/夜晚
**地点**: 具体位置
**人物**: 在场角色
**氛围**: 场景氛围

[场景描述]
（用1-2句话描述场景的视觉呈现和氛围）

**[人物A]**: (动作描述)对话内容
**[人物B]**: (动作描述)对话内容

[动作描写]
（关键动作、表情、情绪变化）

---

（重复上述格式完成所有场次，共6-8场）

---

## 第${episodeNumber}集总结
**关键信息传达**:
**悬念设置**:
**情感基调**:

请开始创作第${episodeNumber}集完整剧本:`;

    const scriptResponse = await llm.invoke(scriptPrompt);
    const script = scriptResponse.content;

    // Step 2: 生成分镜
    const storyboardPrompt = `你是一位专业的分镜师和AI绘图提示词专家。请基于以下剧本制作详细的影视分镜表和AI绘图提示词。

【剧本】
${script}

【任务要求】
1. 为每个场次的关键镜头设计分镜
2. 每个场次提供2-4个关键镜头
3. 为每个镜头撰写英文AI绘图提示词(Midjourney/Stable Diffusion格式)
4. 提示词要包含:场景、人物、构图、光影、情绪、风格

【输出格式】

# 第${episodeNumber}集分镜表

## 场次1: [场景名称]
**整体基调**: (视觉风格和情绪氛围)

### 镜头1-1: [镜头描述]
- **镜头类型**: 远景/全景/中景/特写/大特写
- **运镜方式**: 固定/推拉/摇移/跟随
- **构图**: 描述画面构图
- **时长**: X秒
- **作用**: 该镜头的叙事功能

**AI绘图提示词**:
\`\`\`
[English Prompt]: A cinematic [shot type] of [subject], [environment details], [lighting], [mood], [camera angle], [art style], highly detailed, 8k, professional photography
\`\`\`

---

（每个场次重复上述格式）

---

# 核心视觉元素总结
**色调**:
**主要场景风格**:
**角色视觉关键词**:
**整体艺术风格**:

请开始制作分镜表:`;

    const storyboardResponse = await llm.invoke(storyboardPrompt);
    const storyboard = storyboardResponse.content;

    const executionTime = Date.now() - startTime;

    logger.info('续写工作流执行完成', {
      taskId,
      episodeNumber,
      executionTime: `${executionTime}ms`
    });

    return {
      success: true,
      result: { script, storyboard },
      executionTime
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('续写工作流执行失败', {
      taskId,
      episodeNumber,
      error: error.message,
      executionTime: `${executionTime}ms`
    });
    return {
      success: false,
      error: error.message,
      executionTime
    };
  }
}

module.exports = {
  createDramaWorkflow,
  executeDramaWorkflow,
  executeEpisodeContinuation,
  WorkflowState
};

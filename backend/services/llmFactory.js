/**
 * LLM模型工厂
 * 封装多种大模型的统一调用接口
 * 支持OpenAI、Anthropic、DeepSeek、Qwen、Gemini等
 */

const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { config } = require('../config/env');
const logger = require('../config/logger');

/**
 * 创建LLM实例
 * @param {string} provider - 模型提供商
 * @returns {Object} - LLM实例
 */
function createLLM(provider = config.llm.provider, options = {}) {
  try {
    logger.info(`正在初始化LLM模型: ${provider}`, options.model ? { model: options.model } : {});

    switch (provider.toLowerCase()) {
      case 'openai':
        return createOpenAI(options);

      case 'anthropic':
        return createAnthropic(options);

      case 'deepseek':
        return createDeepSeek(options);

      case 'qwen':
        return createQwen(options);

      case 'gemini':
        return createGemini(options);

      default:
        throw new Error(`不支持的模型提供商: ${provider}`);
    }
  } catch (error) {
    logger.error('LLM模型初始化失败', {
      provider,
      error: error.message
    });
    throw error;
  }
}

/**
 * 创建OpenAI模型实例
 */
function createOpenAI(options = {}) {
  const { openai } = config.llm;
  const apiKey = options.apiKey || openai.apiKey;
  if (!apiKey) throw new Error('OPENAI_API_KEY 未配置');

  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: options.model || openai.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    configuration: { baseURL: options.baseURL || openai.baseURL }
  });
}

function createAnthropic(options = {}) {
  const { anthropic } = config.llm;
  const apiKey = options.apiKey || anthropic.apiKey;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 未配置');

  return new ChatAnthropic({
    anthropicApiKey: apiKey,
    modelName: options.model || anthropic.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens
  });
}

function createDeepSeek(options = {}) {
  const { deepseek } = config.llm;
  const apiKey = options.apiKey || deepseek.apiKey;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置');

  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: options.model || deepseek.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    configuration: { baseURL: options.baseURL || deepseek.baseURL }
  });
}

function createQwen(options = {}) {
  const { qwen } = config.llm;
  const apiKey = options.apiKey || qwen.apiKey;
  if (!apiKey) throw new Error('QWEN_API_KEY 未配置');

  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: options.model || qwen.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    configuration: {
      baseURL: options.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    }
  });
}

function createGemini(options = {}) {
  const { gemini } = config.llm;
  const apiKey = options.apiKey || gemini.apiKey;
  if (!apiKey) throw new Error('GEMINI_API_KEY 未配置');

  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: options.model || gemini.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    configuration: {
      baseURL: options.baseURL || 'https://generativelanguage.googleapis.com/v1beta/openai'
    }
  });
}

/**
 * 测试LLM连接
 * @param {string} provider - 模型提供商
 * @returns {Promise<boolean>} - 测试结果
 */
async function testLLMConnection(provider = config.llm.provider) {
  try {
    const llm = createLLM(provider);
    const response = await llm.invoke('测试连接,请回复"连接成功"');
    
    logger.info('LLM连接测试成功', {
      provider,
      response: response.content.substring(0, 50)
    });
    
    return true;
  } catch (error) {
    logger.error('LLM连接测试失败', {
      provider,
      error: error.message
    });
    return false;
  }
}

/**
 * 通用LLM调用方法
 * @param {string} prompt - 提示词
 * @param {string} provider - 模型提供商
 * @returns {Promise<string>} - 模型响应
 */
async function invokeLLM(prompt, provider = config.llm.provider) {
  try {
    const llm = createLLM(provider);
    const response = await llm.invoke(prompt);
    return response.content;
  } catch (error) {
    logger.error('LLM调用失败', {
      provider,
      error: error.message,
      prompt: prompt.substring(0, 100)
    });
    throw error;
  }
}

module.exports = {
  createLLM,
  testLLMConnection,
  invokeLLM
};

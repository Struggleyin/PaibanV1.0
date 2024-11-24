const API_KEY = '657bd2e0220bee6979ddc7fc4d98f4c2.lbnTg3Ys6bwGZN5p';
const chatAPI = new ChatAPI(API_KEY);

// 保存聊天历史
let messageHistory = [];

document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const textInput = document.getElementById('textInput');
    const preview = document.getElementById('preview');
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const chatHistory = document.getElementById('chatHistory');
    const wordCount = document.getElementById('wordCount');
    const lineCount = document.getElementById('lineCount');
    const importBtn = document.getElementById('importBtn');
    const exportBtn = document.getElementById('exportBtn');
    const fileInput = document.getElementById('fileInput');
    const clearChat = document.getElementById('clearChat');

    // 加载保存的文本
    textInput.value = localStorage.getItem('savedText') || '';
    updatePreview();
    updateStats();

    // 文本统计功能
    function updateStats() {
        const text = textInput.value;
        wordCount.textContent = `字数：${text.length}`;
        lineCount.textContent = `行数：${text.split('\n').length}`;
    }

    // 实时预览功能
    function updatePreview() {
        const text = textInput.value;
        // 不显示任何内容，保持预览区域为空
        preview.innerHTML = '';  // 改为空字符串
        localStorage.setItem('savedText', textInput.value);
        updateStats();
    }

    textInput.addEventListener('input', updatePreview);

    // 导入文件功能
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                textInput.value = e.target.result;
                updatePreview();
            };
            reader.readAsText(file);
        }
    });

    // 导出文件功能
    exportBtn.addEventListener('click', function() {
        const blob = new Blob([textInput.value], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '排版文本.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    // 发送消息功能
    async function sendMessage() {
        const message = chatInput.value.trim();
        const originalText = textInput.value.trim();
        
        if (message) {
            try {
                // 构建更明确的 prompt，要求返回纯 HTML
                const promptMessage = `
任务：将文本转换为HTML代码
要求：
1. 只返回一段完整的HTML代码
2. 不要包含任何注释、解释或其他文字
3. 所有样式都写在style属性中
4. 代码要规范，适当使用换行和缩进

原文内容：
${originalText}

排版要求：
${message}`;
                
                // 添加用户消息到界面
                addMessage(message, 'user');
                
                // 添加消息到历史记录
                messageHistory.push({
                    role: "user",
                    content: promptMessage
                });

                // 添加系统角色设定
                if (messageHistory.length === 1) {
                    messageHistory.unshift({
                        role: "system",
                        content: `你是一个HTML排版工具。严格遵守以下规则：
1. 只输出一段HTML代码
2. 不要有任何解释、注释或额外文字
3. 确保代码是完整且有效的
4. 使用内联style属性设置样式`
                    });
                }

                // 显示加载状态
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'message system-message loading';
                loadingDiv.textContent = '正在处理...';
                chatHistory.appendChild(loadingDiv);

                // 发送API请求
                const response = await chatAPI.sendMessage(messageHistory);
                
                // 移除加载状态
                chatHistory.removeChild(loadingDiv);

                // 从响应中提取HTML代码
                let htmlCode = response;
                // 如果响应包含反引号，只取其中的代码部分
                if (response.includes('```')) {
                    htmlCode = response.match(/```(?:html)?([\s\S]*?)```/)[1].trim();
                }
                // 如果有多余的注释，移除它们
                htmlCode = htmlCode.replace(/<!--[\s\S]*?-->/g, '');
                
                // 添加系统响应到聊天记录
                addMessage(response, 'system');
                
                // 更新预览区域，显示渲染后的HTML
                preview.innerHTML = htmlCode;

                // 添加响应到历史记录
                messageHistory.push({
                    role: "assistant",
                    content: response
                });

                // 清空输入框
                chatInput.value = '';
                
            } catch (error) {
                addMessage('抱歉，发生了错误：' + error.message, 'system');
            }
        }
    }

    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = text;
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // 修改 processCommand 函数
    function processCommand(command) {
        let response = '';
        const preview = document.getElementById('preview');
        const text = textInput.value;
        let styles = [];
        
        // 字号处理
        if (command.includes('字号')) {
            const sizeMap = {
                '初号': '42pt',
                '小初': '36pt',
                '一号': '26pt',
                '小一': '24pt',
                '二号': '22pt',
                '小二': '18pt',
                '三号': '16pt',
                '小三': '15pt',
                '四号': '14pt',
                '小四': '12pt',
                '五号': '10.5pt',
                '小五': '9pt',
                '六号': '7.5pt',
                '小六': '6.5pt',
                '七号': '5.5pt',
                '八号': '5pt'
            };

            for (let [size, value] of Object.entries(sizeMap)) {
                if (command.includes(size)) {
                    preview.style.fontSize = value;
                    response = `已将字号调整为${size}（${value}）`;
                    break;
                }
            }

            // 处理数字形式的字号
            const sizeMatch = command.match(/(\d+)(号|pt|px)/);
            if (sizeMatch) {
                const size = sizeMatch[1];
                const unit = sizeMatch[2];
                const value = unit === '号' ? sizeMap[`${size}号`] || `${size}pt` : `${size}${unit}`;
                preview.style.fontSize = value;
                response = `已将字号调整为${size}${unit}`;
            }
        }
        // 字体处理
        else if (command.includes('字体')) {
            const fontMatch = command.match(/(宋体|黑体|楷体|仿宋|微软雅黑|Arial|Times New Roman)/);
            if (fontMatch) {
                const font = fontMatch[1];
                preview.style.fontFamily = font;
                response = `已将字体设置为${font}`;
            }
        }
        // 行间距处理
        else if (command.includes('行间距')) {
            const spacingMatch = command.match(/([\d.]+)(\s*倍)?/);
            if (spacingMatch) {
                const spacing = spacingMatch[1];
                preview.style.lineHeight = spacing + (spacingMatch[2] ? '' : 'em');
                response = `已设置行间距为${spacing}${spacingMatch[2] || '倍'}`;
            }
        }
        // 段落缩进处理
        else if (command.includes('缩进')) {
            const indentMatch = command.match(/([\d.]+)(\s*字符|\s*em)?/);
            if (indentMatch) {
                const indent = indentMatch[1];
                preview.style.textIndent = indent + (indentMatch[2]?.includes('字符') ? 'em' : 'em');
                response = `已设置段落缩进为${indent}字符`;
            } else {
                preview.style.textIndent = '2em';
                response = '已设置段落缩进为2字符';
            }
        }
        // 对齐方式处理
        else if (command.includes('对齐')) {
            if (command.includes('左对齐')) {
                preview.style.textAlign = 'left';
                response = '已设置左对齐';
            } else if (command.includes('右对齐')) {
                preview.style.textAlign = 'right';
                response = '已设置右对齐';
            } else if (command.includes('居中') || command.includes('中对齐')) {
                preview.style.textAlign = 'center';
                response = '已设置居中对齐';
            } else if (command.includes('两端对齐')) {
                preview.style.textAlign = 'justify';
                response = '已设置两端对齐';
            }
        }
        // 颜色处理
        else if (command.includes('颜色')) {
            const colorMap = {
                '红': 'red',
                '蓝': 'blue',
                '绿': 'green',
                '黑': 'black',
                '白': 'white',
                '灰': 'gray'
            };
            
            for (let [cn, en] of Object.entries(colorMap)) {
                if (command.includes(cn)) {
                    preview.style.color = en;
                    response = `已将文字颜色设置为${cn}色`;
                    break;
                }
            }
        }

        if (!response) {
            response = '抱歉，我不理解这个排版命令。\n可用命令示例：\n- 调整字号到5号\n- 设置宋体\n- 设置1.5倍行间距\n- 设置2字符缩进\n- 设置居中对齐\n- 设置文字颜色为红色';
        }

        // 在应用样式后更新预览
        if (response) {
            // 收集所有已设置的样式
            if (preview.style.fontSize) styles.push(`font-size: ${preview.style.fontSize}`);
            if (preview.style.fontFamily) styles.push(`font-family: ${preview.style.fontFamily}`);
            if (preview.style.lineHeight) styles.push(`line-height: ${preview.style.lineHeight}`);
            if (preview.style.textIndent) styles.push(`text-indent: ${preview.style.textIndent}`);
            if (preview.style.textAlign) styles.push(`text-align: ${preview.style.textAlign}`);
            if (preview.style.color) styles.push(`color: ${preview.style.color}`);

            // 生成带样式的 HTML
            const styledHtml = `<div style="${styles.join('; ')}">\n  ${text}\n</div>`;
            preview.textContent = styledHtml;
        }

        return response;
    }

    // 清空对话
    clearChat.addEventListener('click', function() {
        chatHistory.innerHTML = '';
        messageHistory = []; // 清空消息历史
    });

    // 事件监听器
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}); 
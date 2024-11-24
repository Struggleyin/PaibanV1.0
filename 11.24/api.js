class ChatAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    }

    generateToken() {
        try {
            const [id, secret] = this.apiKey.split('.');
            
            // 创建 header
            const header = {
                "alg": "HS256",
                "sign_type": "SIGN"
            };
            
            // 创建 payload
            const payload = {
                "api_key": id,
                "exp": Math.floor(Date.now() / 1000) + 60, // 1分钟后过期
                "timestamp": Math.floor(Date.now() / 1000)
            };

            // 使用 jsrsasign 生成 token
            const token = KJUR.jws.JWS.sign(
                "HS256",
                JSON.stringify(header),
                JSON.stringify(payload),
                secret
            );
            
            return token;
        } catch (error) {
            console.error('Token生成错误:', error);
            throw error;
        }
    }

    async sendMessage(messages) {
        try {
            const token = this.generateToken();
            console.log('Generated token:', token); // 调试用

            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "glm-4",
                    messages: messages
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API响应详情:', errorData); // 调试用
                throw new Error(`API错误: ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('API请求错误:', error);
            throw error;
        }
    }
} 
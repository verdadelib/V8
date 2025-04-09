// pages/api/llm.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios, { AxiosError } from 'axios';

// *** MUDANÇA DA PORTA AQUI ***
// Atualizar a URL para apontar para a nova porta 8001
const LLM_SERVER_URL = process.env.LLM_SERVER_URL || 'http://127.0.0.1:8001'; // Mudado de 8000 para 8001

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const {
    prompt,
    temperature,
    maxTokens,
    repeatPenalty,
    response_json_schema,
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt é obrigatório.' });
  }

  const endpoint = `${LLM_SERVER_URL}/generate`;
  console.log(`[API LLM->Python] Encaminhando para ${endpoint}`);
  const payload = {
      prompt: prompt,
      temperature: temperature,
      max_new_tokens: maxTokens,
      repetition_penalty: repeatPenalty,
      response_json_schema: response_json_schema,
  };
  console.log(`[API LLM->Python] Payload: { prompt: ${prompt.substring(0,50)}... }`);

  try {
    const response = await axios.post(endpoint, payload, {
        timeout: 120000
    });

    console.log("[API LLM->Python] Resposta recebida do servidor Python:", response.data);
    return res.status(response.status).json(response.data);

  } catch (error: any) {
    // Logs detalhados mantidos
    console.error('[API LLM->Python] Erro ao chamar servidor Python:');
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error('  -> Axios Error Code:', axiosError.code);
      console.error('  -> Axios Error Message:', axiosError.message);
      if (axiosError.response) {
        console.error('  -> Backend Status:', axiosError.response.status);
        console.error('  -> Backend Data:', axiosError.response.data);
        const status = axiosError.response.status;
        const errorData = axiosError.response.data || { error: 'Erro retornado pelo servidor LLM.', details: axiosError.message };
        return res.status(status).json(errorData);
      } else if (axiosError.request) {
        console.error('  -> Nenhuma resposta recebida do backend.');
        return res.status(502).json({ error: 'Falha ao comunicar com o servidor LLM (sem resposta).', code: axiosError.code });
      } else {
        console.error('  -> Erro na configuração da requisição Axios:', axiosError.message);
        return res.status(500).json({ error: 'Erro interno ao preparar requisição para LLM.', details: axiosError.message });
      }
    } else {
      console.error('  -> Erro não-Axios:', error.message);
      return res.status(500).json({ error: 'Erro interno inesperado na API LLM.', details: error.message });
    }
  }
}
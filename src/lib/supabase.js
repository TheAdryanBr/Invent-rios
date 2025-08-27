import { createClient } from '@supabase/supabase-js';

// Temporário: coloque suas credenciais diretamente aqui para testar
const supabaseUrl = 'https://izzuehzdrwcasqkatdzn.supabase.co'; // Substitua pela sua URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6enVlaHpkcndjYXNxa2F0ZHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzIzMzUsImV4cCI6MjA3MTgwODMzNX0.dzObSEoOHzXJvJCwOfUu504GSgRoHyUTE1i7v8BmKzs'; // Substitua pela sua chave

// Para produção, use as variáveis de ambiente:
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não configuradas');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey ? 'Configurada' : 'Não configurada');
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (!supabase) {
  console.warn('Cliente Supabase não foi criado devido a configurações faltando');
}
import { createClient } from '@supabase/supabase-js';

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

/**
 * Configuração e inicialização do Firebase Admin SDK.
 *
 * Responsável por disponibilizar os serviços administrativos
 * utilizados pelo backend, como autenticação e acesso ao Firestore.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  cert,
  getApps,
  initializeApp,
  ServiceAccount,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Caminho do arquivo de credenciais da conta de serviço do Firebase.
 */
const serviceAccountPath = join(process.cwd(), 'firebase-service-account.json');

/**
 * Carrega e converte o arquivo de credenciais para o formato
 * esperado pelo Firebase Admin SDK.
 */
const serviceAccount = JSON.parse(
  readFileSync(serviceAccountPath, 'utf8'),
) as ServiceAccount;

/**
 * Inicializa o Firebase Admin apenas se ainda não existir
 * uma instância criada na aplicação.
 *
 * Essa verificação evita múltiplas inicializações do SDK,
 * especialmente durante recarregamentos da aplicação.
 */
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

/**
 * Serviço de autenticação administrativa do Firebase.
 *
 * Utilizado para validar tokens JWT enviados pelo frontend.
 */
export const adminAuth = getAuth();
/**
 * Instância administrativa do Firestore.
 *
 * Utilizada pelo backend para acessar e manipular dados
 * armazenados no banco de dados.
 */
export const adminDb = getFirestore();

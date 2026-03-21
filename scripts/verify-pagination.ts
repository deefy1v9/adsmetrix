import { getAdAccounts } from "../lib/meta-api";
import "dotenv/config";

async function verify() {
    console.log("Verificando paginação de contas...");
    try {
        const accounts = await getAdAccounts();
        console.log(`TOTAL DE CONTAS ENCONTRADAS: ${accounts.length}`);
        if (accounts.length > 25) {
            console.log("SUCESSO: Paginação funcionando (mais de 25 contas).");
        } else if (accounts.length === 25) {
            console.log("AVISO: Exatamente 25 contas encontradas. Pode ser que ainda esteja limitado ou você tenha exatamente 25.");
        } else {
            console.log(`Encontradas ${accounts.length} contas.`);
        }
    } catch (e) {
        console.error("Erro na verificação:", e);
    }
}

verify();

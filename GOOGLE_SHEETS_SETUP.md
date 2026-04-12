# Configuração do Banco de Dados (Google Sheets)

Para utilizar o Google Sheets como banco de dados, siga os passos abaixo:

## 1. Criar a Planilha
Crie uma nova Planilha Google e adicione as seguintes abas (páginas):
- `Materials`
- `Locations`
- `Users`
- `Settings`
- `Documents`
- `Loans`
- `Logs`

## 2. Configurar o Script
1. Na sua planilha, vá em **Extensões > Apps Script**.
2. Apague todo o código existente e cole o código abaixo:

```javascript
/**
 * SGA - Google Sheets Database Script
 * Versão: 1.0.0
 */

function doGet(e) {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  const data = {};
  
  sheets.forEach(sheet => {
    const name = sheet.getName();
    const values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      const headers = values[0];
      const rows = values.slice(1);
      data[name] = rows.map(row => {
        const obj = {};
        headers.forEach((header, i) => {
          let val = row[i];
          // Tenta parsear JSON se parecer um objeto/array
          if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            try { val = JSON.parse(val); } catch (e) {}
          }
          obj[header] = val;
        });
        return obj;
      });
    } else {
      data[name] = [];
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Adiciona suporte a preflight CORS se necessário
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action; // 'sync_all' ou 'add_log'
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'sync_all') {
    const data = payload.data;
    Object.keys(data).forEach(sheetName => {
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }
      sheet.clear();
      
      const items = data[sheetName];
      if (items.length > 0) {
        const headers = Object.keys(items[0]);
        sheet.appendRow(headers);
        
        const rows = items.map(item => {
          return headers.map(h => {
            const val = item[h];
            return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
          });
        });
        
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }
    });
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'add_log') {
    const log = payload.log;
    let sheet = ss.getSheetByName('Logs');
    if (!sheet) {
      sheet = ss.insertSheet('Logs');
      sheet.appendRow(Object.keys(log));
    }
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(h => {
      const val = log[h];
      return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
    });
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 3. Implantar como Web App (CRÍTICO)
1. No editor do Apps Script, clique em **Implantar > Nova implantação**.
2. Selecione o tipo **App da Web**.
3. Em "Descrição", coloque "SGA Database".
4. Em "Executar como", selecione **Você** (seu e-mail).
5. Em "Quem tem acesso", selecione **Qualquer pessoa** (Anyone). 
   - **ATENÇÃO:** Se você selecionar "Qualquer pessoa com conta Google", o sistema NÃO funcionará corretamente dentro do AI Studio devido a restrições de redirecionamento de login. Deve ser **Qualquer pessoa** (anônimo).
6. Clique em **Implantar**.
7. Autorize as permissões solicitadas pelo Google.
8. Copie a **URL do App da Web** (termina em `/exec`).

> **Dica de Erro de Rede:** Se você receber "NetworkError", verifique se o passo 5 foi feito corretamente. Se você já implantou, clique em **Implantar > Gerenciar implantações**, edite a versão atual e mude para **Qualquer pessoa**.

## 4. Configurar no SGA
1. No SGA, vá em **Configurações**.
2. Insira a URL copiada no campo **URL do Banco de Dados (Google Sheets)**.
3. Clique em **Sincronizar**.

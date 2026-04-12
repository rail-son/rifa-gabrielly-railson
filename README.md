# 💍 Rifa de Casamento — Gabrielly & Railson

Site completo de rifa de casamento com seleção interativa de números, geração de QR Code PIX e painel administrativo.

---

## 🚀 Setup Rápido (5 passos)

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **New Project** e preencha os dados
3. Aguarde o projeto inicializar (~2 minutos)

### 2. Configurar o banco de dados

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New query**
3. Copie e cole todo o conteúdo de `supabase/schema.sql`
4. Clique em **Run** (▶)

> ⚠️ O schema inclui as funções `create_reservation`, `confirm_reservation`, `cancel_reservation`, `expire_old_reservations` e `admin_register_numbers`. Todas precisam ser criadas para o site funcionar corretamente.

### 3. Criar usuário administrador

1. No painel do Supabase, vá em **Authentication → Users**
2. Clique em **Add user → Create new user**
3. Preencha o e-mail e senha que você usará para acessar `/admin`
4. Clique em **Create user**

### 4. Configurar variáveis de ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

Edite o `.env` com os valores do seu projeto Supabase:
- **URL**: Supabase Dashboard → Settings → API → **Project URL**
- **Anon Key**: Supabase Dashboard → Settings → API → **anon public**

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Instalar e rodar

```bash
npm install
npm run dev
```

Acesse: **http://localhost:5173**  
Admin: **http://localhost:5173/admin**

---

## 📸 Foto do Casal

Coloque a foto do casal em `public/FOTO_DO_CASAL.jpeg`. A imagem será exibida em moldura circular dourada no topo da página pública.

Dimensões recomendadas: **400×400px** ou qualquer proporção quadrada.

---

## 🏗️ Estrutura do Projeto

```
rifa-casamento/
├── public/
│   ├── FOTO_DO_CASAL.jpeg   ← Foto do casal (adicione aqui!)
│   └── heart-icon.svg       ← Favicon
├── src/
│   ├── lib/
│   │   ├── supabase.js      ← Cliente Supabase + todas as funções de dados
│   │   └── pix.js           ← Gerador de QR Code PIX (BR Code EMV)
│   ├── pages/
│   │   ├── Home.jsx         ← Página pública da rifa
│   │   └── Admin.jsx        ← Painel administrativo completo
│   ├── components/
│   │   ├── HeartNumber.jsx    ← Botão coração individual (4 estados visuais)
│   │   ├── NumberGrid.jsx     ← Grade 240 corações + Supabase Realtime
│   │   ├── PaymentModal.jsx   ← Modal de reserva + QR Code PIX
│   │   └── DrawAnimation.jsx  ← Animação de sorteio com nome do ganhador
│   ├── App.jsx              ← Roteamento
│   ├── main.jsx             ← Entry point
│   └── index.css            ← Estilos globais + Tailwind
├── supabase/
│   └── schema.sql           ← Schema completo do banco de dados
├── .env.example
└── README.md
```

---

## 🎨 Personalização

### Alterar cores

Edite as variáveis no `tailwind.config.js`:
```js
colors: {
  cream: '#f5f0e8',     // fundo principal
  moss: '#5c6b4a',      // verde musgo (corações disponíveis)
  gold: '#c9a84c',      // dourado (corações selecionados)
  charcoal: '#1c1c1c',  // preto (números vendidos)
  amber: '#d4a017',     // amarelo (números reservados)
}
```

### Alterar dados da rifa

No painel `/admin` → aba **⚙️ Config**, você pode editar:
- Nome do casal
- Data do sorteio
- Valor por número
- Chave PIX

### Alterar chave PIX

A chave PIX padrão é `+5534991737875` (telefone no formato E.164).

Se a sua chave for diferente (CPF, e-mail, chave aleatória), atualize:
1. No painel admin → Config → Chave PIX
2. E também em `src/lib/pix.js` na função `generateRifaPix()` — o parâmetro `key`

**Formatos aceitos pelo PIX:**
- Telefone: `+5534991737875`
- CPF: `12345678901`
- E-mail: `railson@email.com`
- Chave aleatória: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## 🔄 Expiração Automática de Reservas

Reservas pendentes expiram em **30 minutos**. Duas formas de implementar a limpeza automática:

### Opção A: pg_cron (recomendado para produção)

No Supabase Dashboard → Database → Extensions, ative o `pg_cron`.  
Depois execute no SQL Editor:

```sql
SELECT cron.schedule(
  'expire-reservations',
  '*/5 * * * *',
  $$SELECT expire_old_reservations();$$
);
```

### Opção B: Chamada periódica no frontend

Adicione ao `Home.jsx`:

```js
useEffect(() => {
  const interval = setInterval(() => {
    supabase.rpc('expire_old_reservations');
  }, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

---

## 🌐 Deploy (Vercel — recomendado)

```bash
npm install -g vercel
vercel
```

Configure as variáveis de ambiente no painel da Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| React 18 | Interface do usuário |
| Vite | Build tool |
| Tailwind CSS | Estilização mobile-first |
| Supabase | PostgreSQL + Realtime + Auth |
| react-qr-code | Renderização do QR Code PIX |
| date-fns | Formatação de datas |
| PIX BR Code (custom) | Geração do código PIX conforme spec BCB |

---

## 📋 Funcionalidades

### Página Pública (`/`)
- ✅ Grade com 240 corações interativos
- ✅ 4 estados visuais: disponível (verde), reservado (amarelo), vendido (preto + X), selecionado (dourado)
- ✅ Seleção múltipla com contador de valor em tempo real
- ✅ Barra flutuante com total, chips dos números e botão de reserva
- ✅ Formulário: nome + WhatsApp (obrigatório) + e-mail (opcional)
- ✅ QR Code PIX gerado dinamicamente com valor exato
- ✅ Código PIX copia-e-cola
- ✅ Timer countdown de 30 minutos na etapa de pagamento
- ✅ Link direto WhatsApp para envio do comprovante
- ✅ Atualização em tempo real via Supabase Realtime
- ✅ Premiação dinâmica — prêmios desbloqueiam conforme números são vendidos
- ✅ Barra de progresso geral com marcadores de meta (100, 150, 200)
- ✅ Fechar o modal do formulário mantém os números selecionados
- ✅ Fechar o modal do PIX (após reserva criada) limpa a seleção
- ✅ Layout mobile-first (otimizado para compartilhamento via WhatsApp)
- ✅ Botão discreto "Área restrita" no rodapé para acesso ao admin

### Painel Admin (`/admin`)
- ✅ Login via Supabase Auth com link "← Voltar para o site" na tela de login
- ✅ Dashboard com total arrecadado, pendente, números vendidos e disponíveis
- ✅ Barra de progresso geral
- ✅ Status dos prêmios com progresso dinâmico e badge de desbloqueio
- ✅ Tabela de reservas com filtro por status (todos / aguardando / confirmados / cancelados)
- ✅ Confirmar pagamento (reservado → pago) + notificação automática via WhatsApp
- ✅ Cancelar reserva (libera os números)
- ✅ **Registro manual** — registrar números como pagos para compradores fora do site
- ✅ Exportar lista de compradores em CSV
- ✅ Grade visual com cores por status + tooltip com nome e WhatsApp do comprador
- ✅ Sorteio animado entre números pagos com revelação do nome do ganhador
- ✅ Botão para notificar o ganhador via WhatsApp
- ✅ Configurações editáveis (nome do casal, data do sorteio, valor por número, chave PIX)

---

## ❓ Dúvidas Frequentes

**O QR Code gerado funciona com qualquer banco?**  
Sim. O código segue a especificação EMV BR Code do Banco Central do Brasil, aceito por todos os apps de pagamento que suportam PIX.

**Como confirmar que o pagamento foi feito?**  
O cliente envia o comprovante no WhatsApp → você confirma no painel admin → os números ficam marcados como pagos e o cliente recebe uma mensagem automática de confirmação.

**Os números ficam travados para sempre se alguém não pagar?**  
Não. Reservas expiram automaticamente em 30 minutos (via pg_cron ou função frontend). Você também pode cancelar manualmente no painel admin.

**Alguém comprou fora do site, como registro?**  
No painel admin, clique em **✍️ Registrar** no topo ou na aba **♥ Grade**. Preencha os dados do comprador e adicione os números — eles serão marcados diretamente como pagos.

**Posso usar outra chave PIX?**  
Sim, veja a seção "Alterar chave PIX" acima.

**Como fazer o sorteio?**  
No painel admin, clique em **🎲 Sortear** no topo. A animação sorteará um número aleatório entre todos os pagos e revelará o nome do ganhador. Há um botão para notificá-lo pelo WhatsApp automaticamente.

---

*Feito com ❤️ para Gabrielly & Railson — que o casamento seja lindo!*

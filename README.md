# RMAPro — Gestão de RMA

Sistema de gestão de RMA (Return Merchandise Authorization) para clientes e fornecedores, construído com React, TypeScript, Vite e Supabase.

## 🚀 Deploy na Vercel

### Pré-requisitos
- Conta na [Vercel](https://vercel.com)
- Projeto no [Supabase](https://supabase.com) configurado

### Passos

1. **Fork / clone** este repositório no GitHub
2. **Importar projeto na Vercel:**
   - Acede a [vercel.com/new](https://vercel.com/new) e importa o repositório
   - **Root Directory:** `RMAPro`
   - **Framework Preset:** Vite (deteta automaticamente)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

3. **Configurar variáveis de ambiente** na Vercel (Settings → Environment Variables):

   | Variável | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | URL do teu projeto Supabase |
   | `VITE_SUPABASE_ANON_KEY` | Chave anon/public do Supabase |

   > Encontras estes valores em **Supabase → Settings → API**

4. **Deploy!** A Vercel faz o build e publica automaticamente.

---

## 💻 Desenvolvimento Local

### Pré-requisitos
- Node.js 18+

### Instalação

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env

# Preencher o .env com as tuas credenciais Supabase
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...

# Iniciar servidor de desenvolvimento
npm run dev
```

### Build de produção

```bash
npm run build
```

---

## 🛠️ Stack Técnica

- **Frontend:** React 18 + TypeScript + Vite
- **Estilo:** Tailwind CSS v4
- **Base de dados:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth
- **Deploy:** Vercel

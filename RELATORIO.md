# Test Patterns

**Aluno:** Mateus Faissal
**Matrícula:** 837673  

---

## 1. Padrões de Criação de Dados (Builders)

### 1.1 Por que o CarrinhoBuilder foi usado em vez de um CarrinhoMother?

O `Carrinho` é um objeto complexo que pode assumir diversas configurações nos testes: pode ter diferentes usuários (padrão ou premium), diferentes quantidades e tipos de itens, ou até estar vazio. Se utilizássemos um **Object Mother** para o Carrinho, precisaríamos criar um método estático para cada combinação possível, o que levaria a uma **explosão de métodos**:

- `CarrinhoMother.umCarrinhoVazio()`
- `CarrinhoMother.umCarrinhoComUsuarioPadrao()`
- `CarrinhoMother.umCarrinhoComUsuarioPremium()`
- `CarrinhoMother.umCarrinhoComDoisItens()`
- `CarrinhoMother.umCarrinhoComUsuarioPremiumEDoisItens()`
- ... e assim por diante.

O padrão **Data Builder** resolve esse problema oferecendo uma API fluente que permite compor o objeto passo a passo, customizando apenas o que é relevante para cada cenário de teste.

Já o `User` é uma entidade simples com variações limitadas (PADRAO ou PREMIUM), tornando o **Object Mother** a escolha ideal — métodos estáticos diretos como `UserMother.umUsuarioPadrao()` e `UserMother.umUsuarioPremium()` são suficientes.

### 1.2 Exemplo: Antes (Setup Manual) vs. Depois (Data Builder)

**ANTES — Setup manual complexo e obscuro:**

```javascript
it('deve aplicar desconto para premium', async () => {
  // Setup obscuro: o leitor precisa entender cada linha para saber
  // o que é relevante para este teste
  const user = new User(2, 'Maria Premium', 'premium@email.com', 'PREMIUM');
  const item1 = new Item('Camiseta', 100);
  const item2 = new Item('Calça', 100);
  const itens = [item1, item2];
  const carrinho = new Carrinho(user, itens);
  
  // ... resto do teste
});
```

**DEPOIS — Setup com Data Builder (legível e intencional):**

```javascript
it('deve aplicar desconto para premium', async () => {
  // Setup claro: o Builder evidencia apenas o que importa para o teste
  const usuarioPremium = UserMother.umUsuarioPremium();
  const carrinho = new CarrinhoBuilder()
    .comUser(usuarioPremium)
    .comItens([new Item('Camiseta', 100), new Item('Calça', 100)])
    .build();
  
  // ... resto do teste
});
```

### 1.3 Como o Builder melhora a legibilidade e manutenção

1. **Legibilidade:** A API fluente torna o setup auto-documentado. Ao ler `.comUser(usuarioPremium).comItens([...])`, fica imediatamente claro qual é a configuração relevante para aquele cenário.

2. **Manutenção:** Se o construtor de `Carrinho` mudar (por exemplo, adicionando um campo `cupomDesconto`), basta atualizar o `CarrinhoBuilder` em um único lugar. Sem o Builder, seria necessário atualizar dezenas de testes manualmente.

3. **Prevenção de Test Smells:** O Builder elimina o *Obscure Setup* — cada teste mostra apenas o que é relevante para seu cenário, usando valores padrão para o restante. Isso também evita o *Test Code Duplication*, pois a lógica de construção fica centralizada.

---

## 2. Padrões de Test Doubles (Mocks vs. Stubs)

### 2.1 Análise do teste "sucesso Premium" (Etapa 5)

No teste `'quando um cliente Premium finaliza a compra'`, as dependências externas do `CheckoutService` foram substituídas por Test Doubles:

| Dependência | Tipo de Double | Papel no Teste |
|---|---|---|
| `GatewayPagamento` | **Stub** | Retorna `{ success: true }` para permitir que o fluxo continue |
| `PedidoRepository` | **Stub** | Retorna um pedido salvo com ID para simular a persistência |
| `EmailService` | **Mock** | Verificamos **se** foi chamado, **quantas vezes** e **com quais argumentos** |

### 2.2 Por que o GatewayPagamento é (principalmente) um Stub?

O `GatewayPagamento` é um **Stub** porque seu papel principal no teste é **fornecer uma resposta pré-definida** (`{ success: true }`) que permite ao fluxo de execução continuar. Estamos interessados no **estado resultante** da operação (o pedido foi processado? o valor cobrado estava correto?), não em verificar se o gateway foi chamado como objetivo principal do teste.

A verificação `expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, ...)` é uma **Verificação de Estado indireta** — estamos confirmando que a regra de negócio de desconto (10% para Premium) foi aplicada corretamente antes de chamar o gateway. O foco é no **valor calculado** (estado), não na interação em si.

Isso caracteriza a **Verificação de Estado (State Verification)**: o teste valida que o sistema produziu o resultado correto (valor com desconto = R$ 180,00).

### 2.3 Por que o EmailService é um Mock?

O `EmailService` é um **Mock** porque o objetivo principal é verificar o **comportamento** — ou seja, confirmar que uma **interação específica aconteceu**:

```javascript
expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
expect(emailMock.enviarEmail).toHaveBeenCalledWith(
  'premium@email.com',
  'Seu Pedido foi Aprovado!',
  expect.stringContaining('180')
);
```

O envio de e-mail é um **efeito colateral** (side effect) — não produz um retorno que afete o estado do pedido. A única forma de garantir que o sistema notificou o cliente corretamente é verificando se o método foi chamado com os argumentos esperados.

Isso caracteriza a **Verificação de Comportamento (Behavior Verification)**: o teste valida que o sistema **interagiu corretamente** com a dependência externa.

### 2.4 Resumo: Stub vs. Mock

| Aspecto | Stub | Mock |
|---|---|---|
| **Propósito** | Controlar o fluxo/retorno | Verificar interações |
| **Verificação** | Estado (resultado) | Comportamento (chamadas) |
| **Pergunta que responde** | "O sistema produziu o resultado certo?" | "O sistema chamou o colaborador certo, da forma certa?" |
| **Exemplo no projeto** | GatewayPagamento retorna `{ success: true }` | EmailService foi chamado com e-mail e assunto corretos |

---

## 3. Conclusão

O uso deliberado de **Padrões de Teste** — tanto para criação de dados (Object Mother e Data Builder) quanto para isolamento de dependências (Stubs e Mocks) — é fundamental para construir uma suíte de testes **sustentável** e **eficaz**.

Os **Builders** previnem o Test Smell de *Obscure Setup*, tornando cada teste auto-documentado e resiliente a mudanças no modelo de domínio. O **Object Mother** complementa o Builder para entidades simples, evitando complexidade desnecessária.

Os **Test Doubles** (Stubs e Mocks) previnem o Test Smell de *Fragile Tests* ao isolar completamente a lógica de negócio das dependências externas. Com Stubs, controlamos o cenário; com Mocks, garantimos que efeitos colaterais importantes (como notificações) acontecem corretamente.

Juntos, esses padrões permitem que os testes sejam:
- **Rápidos:** Sem chamadas reais a gateways, bancos de dados ou serviços de e-mail.
- **Determinísticos:** O comportamento das dependências é controlado e previsível.
- **Focados:** Cada teste valida exatamente um aspecto do comportamento do sistema.
- **Legíveis:** O padrão AAA (Arrange, Act, Assert) combinado com Builders torna a intenção de cada teste clara.

Essa abordagem transforma a suíte de testes de um fardo de manutenção em um **ativo de qualidade** que documenta o comportamento esperado do sistema e fornece feedback rápido durante o desenvolvimento.

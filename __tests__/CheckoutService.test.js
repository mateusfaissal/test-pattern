import { CheckoutService } from '../src/services/CheckoutService.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';
import { Item } from '../src/domain/Item.js';

describe('CheckoutService', () => {

  // =========================================================================
  // Etapa 4: Padrão Stub (Verificação de Estado)
  // =========================================================================
  describe('quando o pagamento falha', () => {
    it('deve retornar null se o gateway recusar o pagamento', async () => {
      // Arrange
      const carrinho = new CarrinhoBuilder().build();

      // Stub para o GatewayPagamento - retorna { success: false }
      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({ success: false }),
      };

      // Dummies - não devem ser chamados neste cenário
      const repositoryDummy = {
        salvar: jest.fn(),
      };
      const emailDummy = {
        enviarEmail: jest.fn(),
      };

      const checkoutService = new CheckoutService(
        gatewayStub,
        repositoryDummy,
        emailDummy
      );

      // Act
      const pedido = await checkoutService.processarPedido(carrinho, '4111-1111-1111-1111');

      // Assert (Verificação de Estado)
      expect(pedido).toBeNull();

      // Verifica que as dependências posteriores não foram chamadas
      expect(repositoryDummy.salvar).not.toHaveBeenCalled();
      expect(emailDummy.enviarEmail).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Etapa 5: Padrão Mock (Verificação de Comportamento)
  // =========================================================================
  describe('quando um cliente Premium finaliza a compra', () => {
    it('deve aplicar desconto de 10% e enviar e-mail de confirmação', async () => {
      // Arrange
      const usuarioPremium = UserMother.umUsuarioPremium();

      // Carrinho com R$ 200,00 em itens para o usuário Premium
      const carrinho = new CarrinhoBuilder()
        .comUser(usuarioPremium)
        .comItens([
          new Item('Camiseta', 100),
          new Item('Calça', 100),
        ])
        .build();

      // Stub para o GatewayPagamento - retorna sucesso
      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({ success: true }),
      };

      // Stub para o PedidoRepository - retorna o pedido salvo com ID
      const repositoryStub = {
        salvar: jest.fn().mockResolvedValue({
          id: 'pedido-123',
          carrinho,
          totalFinal: 180,
          status: 'PROCESSADO',
        }),
      };

      // Mock para o EmailService - queremos verificar se foi chamado corretamente
      const emailMock = {
        enviarEmail: jest.fn().mockResolvedValue(true),
      };

      const checkoutService = new CheckoutService(
        gatewayStub,
        repositoryStub,
        emailMock
      );

      // Act
      const pedidoSalvo = await checkoutService.processarPedido(carrinho, '4111-1111-1111-1111');

      // Assert (Verificação de Comportamento)

      // Verifica se o gateway foi chamado com o valor com desconto (R$ 180,00)
      expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, '4111-1111-1111-1111');

      // Verifica se o pedido foi salvo
      expect(repositoryStub.salvar).toHaveBeenCalledTimes(1);

      // Verifica se o EmailService foi chamado 1 vez
      expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);

      // Verifica se o EmailService foi chamado com os argumentos corretos
      expect(emailMock.enviarEmail).toHaveBeenCalledWith(
        'premium@email.com',
        'Seu Pedido foi Aprovado!',
        expect.stringContaining('180')
      );

      // Verifica o retorno (estado)
      expect(pedidoSalvo).not.toBeNull();
      expect(pedidoSalvo.id).toBe('pedido-123');
    });
  });

  // =========================================================================
  // Teste adicional: Cliente Padrão (sem desconto)
  // =========================================================================
  describe('quando um cliente Padrão finaliza a compra', () => {
    it('deve cobrar o valor total sem desconto', async () => {
      // Arrange
      const usuarioPadrao = UserMother.umUsuarioPadrao();

      const carrinho = new CarrinhoBuilder()
        .comUser(usuarioPadrao)
        .comItens([
          new Item('Teclado', 150),
        ])
        .build();

      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({ success: true }),
      };

      const repositoryStub = {
        salvar: jest.fn().mockResolvedValue({
          id: 'pedido-456',
          carrinho,
          totalFinal: 150,
          status: 'PROCESSADO',
        }),
      };

      const emailMock = {
        enviarEmail: jest.fn().mockResolvedValue(true),
      };

      const checkoutService = new CheckoutService(
        gatewayStub,
        repositoryStub,
        emailMock
      );

      // Act
      await checkoutService.processarPedido(carrinho, '4222-2222-2222-2222');

      // Assert - valor total sem desconto (R$ 150,00)
      expect(gatewayStub.cobrar).toHaveBeenCalledWith(150, '4222-2222-2222-2222');

      // E-mail enviado para o usuário padrão
      expect(emailMock.enviarEmail).toHaveBeenCalledWith(
        'joao@email.com',
        'Seu Pedido foi Aprovado!',
        expect.stringContaining('150')
      );
    });
  });
});

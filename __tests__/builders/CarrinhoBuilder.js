import { Carrinho } from '../../src/domain/Carrinho.js';
import { Item } from '../../src/domain/Item.js';
import { UserMother } from './UserMother.js';

/**
 * Data Builder - Padrão para criação de objetos complexos de forma fluente.
 * O Carrinho pode ter diferentes usuários, vários itens ou estar vazio.
 * O Builder resolve o Test Smell de "Setup Obscuro", tornando explícito
 * apenas o que é importante para cada cenário de teste.
 */
export class CarrinhoBuilder {

  constructor() {
    // Valores padrão: um carrinho com 1 item para um usuário padrão
    this.user = UserMother.umUsuarioPadrao();
    this.itens = [new Item('Produto Padrão', 50)];
  }

  comUser(user) {
    this.user = user;
    return this;
  }

  comItens(itens) {
    this.itens = itens;
    return this;
  }

  comItem(nome, preco) {
    this.itens.push(new Item(nome, preco));
    return this;
  }

  vazio() {
    this.itens = [];
    return this;
  }

  build() {
    return new Carrinho(this.user, this.itens);
  }
}

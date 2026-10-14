-- MIGRAÇÃO DO MÓDULO DE ENTREGA POR PEDIDO
-- Execute uma única vez no schema railway pelo MySQL Workbench.
-- Faça backup do banco antes de executar.
--
-- Adiciona o telefone do cliente para pesquisar pedidos.
-- Adiciona uma marcação por linha de item para registrar entrega/consumo.

ALTER TABLE clientes
    ADD COLUMN telefone VARCHAR(11) NULL AFTER cpf;

ALTER TABLE itens_venda
    ADD COLUMN consumido TINYINT(1) NOT NULL DEFAULT 0 AFTER quantidade;

CREATE INDEX idx_clientes_telefone
    ON clientes (telefone);

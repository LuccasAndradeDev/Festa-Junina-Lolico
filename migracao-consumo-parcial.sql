-- MIGRAÇÃO PARA CONSUMO PARCIAL POR UNIDADE
-- Execute uma única vez em cada banco (local e Railway).
-- Faça um backup antes da execução.
--
-- Registra quantas unidades de cada linha de venda já foram entregues.
-- Mantém como totalmente consumidos os itens marcados assim pelo sistema antigo.

ALTER TABLE itens_venda
    ADD COLUMN quantidade_consumida INT UNSIGNED NOT NULL DEFAULT 0
    AFTER quantidade;

UPDATE itens_venda
SET quantidade_consumida = quantidade
WHERE consumido = 1;

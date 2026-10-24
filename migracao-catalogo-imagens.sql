-- MIGRAÇÃO DO CATÁLOGO: REMOÇÃO SEGURA DE PRODUTOS E IMAGENS ANEXADAS
-- Execute UMA única vez em cada banco (local e Railway).
-- Faça backup antes de executar.
--
-- "Excluir produto" passa a desativá-lo para preservar os itens de venda antigos.
ALTER TABLE produtos
    ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER imagem;

-- As imagens carregadas pelo administrador ficam no MySQL,
-- para sobreviver a reinícios e novas implantações no Railway.
CREATE TABLE IF NOT EXISTS produto_imagens (
    id CHAR(36) NOT NULL PRIMARY KEY,
    mime_type VARCHAR(30) NOT NULL,
    imagem MEDIUMBLOB NOT NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

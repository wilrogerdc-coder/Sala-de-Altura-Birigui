-- =============================================================================
-- SALA DE ALTURA - SCRIPT DE ATUALIZAÇÃO DO BANCO DE DADOS
-- Módulo: Empréstimos e Cargas Temporárias (Retirada, Devolução e Faltas)
-- =============================================================================
-- Este script adiciona o suporte completo para:
-- 1. Responsável pela entrega/despacho do material no momento da saída;
-- 2. Termo e observações no momento da devolução;
-- 3. Conferência item a item na devolução com identificação de materiais faltantes;
-- 4. Registro de carga mantida aberta com faltas ou encerrada gerando faltas;
-- 5. Armazenamento estruturado de itens devolvidos e pendentes.
-- =============================================================================

-- =============================================================================
-- 1. MIGRAÇÃO / ATUALIZAÇÃO PARA TABELA EXISTENTE (PostgreSQL / CockroachDB)
-- =============================================================================
ALTER TABLE loans 
    ADD COLUMN IF NOT EXISTS delivery_responsible VARCHAR(255),
    ADD COLUMN IF NOT EXISTS return_responsible VARCHAR(255),
    ADD COLUMN IF NOT EXISTS return_observations TEXT,
    ADD COLUMN IF NOT EXISTS missing_observations TEXT,
    ADD COLUMN IF NOT EXISTS has_missing_items BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS returned_materials JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS missing_materials JSONB DEFAULT '[]'::jsonb;

-- Comentários descritivos das colunas para auditoria
COMMENT ON COLUMN loans.delivery_responsible IS 'Militar ou armeiro responsável por entregar/despachar os materiais na saída';
COMMENT ON COLUMN loans.return_responsible IS 'Militar responsável por conferir e receber os materiais na devolução';
COMMENT ON COLUMN loans.return_observations IS 'Termo ou observações gerais inseridas no momento da devolução';
COMMENT ON COLUMN loans.missing_observations IS 'Observações específicas e justificativa de materiais faltantes/pendentes';
COMMENT ON COLUMN loans.has_missing_items IS 'Indica se a devolução conteve itens faltantes/pendências';
COMMENT ON COLUMN loans.returned_materials IS 'Array JSON com a relação de materiais e quantidades devolvidas';
COMMENT ON COLUMN loans.missing_materials IS 'Array JSON com a relação de materiais e quantidades faltantes';

-- Índices recomendados para busca ágil
CREATE INDEX IF NOT EXISTS idx_loans_has_missing_items ON loans(has_missing_items);
CREATE INDEX IF NOT EXISTS idx_loans_delivery_responsible ON loans(delivery_responsible);
CREATE INDEX IF NOT EXISTS idx_loans_return_responsible ON loans(return_responsible);


-- =============================================================================
-- 2. MIGRAÇÃO PARA MYSQL / MARIADB (Caso utilize MySQL)
-- =============================================================================
/*
ALTER TABLE loans
    ADD COLUMN IF NOT EXISTS delivery_responsible VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS return_responsible VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS return_observations TEXT NULL,
    ADD COLUMN IF NOT EXISTS missing_observations TEXT NULL,
    ADD COLUMN IF NOT EXISTS has_missing_items BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS returned_materials JSON NULL,
    ADD COLUMN IF NOT EXISTS missing_materials JSON NULL;
*/


-- =============================================================================
-- 3. ESQUEMA COMPLETO DE CRIAÇÃO DA TABELA (DDL Completo - PostgreSQL)
-- =============================================================================
CREATE TABLE IF NOT EXISTS loans (
    id VARCHAR(64) PRIMARY KEY,
    soldier_name VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    course_name VARCHAR(255),
    observations TEXT,
    expected_duration VARCHAR(100),
    exit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    return_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'ativo', -- 'ativo' ou 'devolvido'
    source_location_id VARCHAR(64),              -- ID da viatura ou reserva
    delivery_responsible VARCHAR(255),           -- Responsável pela entrega na saída
    return_responsible VARCHAR(255),             -- Responsável pelo recebimento na devolução
    return_observations TEXT,                    -- Termo / observações da devolução
    missing_observations TEXT,                   -- Registro de faltas
    has_missing_items BOOLEAN DEFAULT FALSE,     -- Indicador de faltas
    returned_materials JSONB DEFAULT '[]'::jsonb,-- Itens recebidos
    missing_materials JSONB DEFAULT '[]'::jsonb, -- Itens faltantes
    materials JSONB NOT NULL DEFAULT '[]'::jsonb -- Itens originalmente retirados
);

-- =============================================================================
-- 4. MAPEAMENTO DE CAMPOS PARA O GOOGLE SHEETS (Caso utilize Sheets como DB)
-- =============================================================================
-- Na aba 'Loans' da planilha, os cabeçalhos são automaticamente sincronizados:
-- | id | soldierName | destination | courseName | observations | expectedDuration |
-- | exitDate | returnDate | status | sourceLocationId | deliveryResponsible |
-- | returnResponsible | returnObservations | missingObservations | hasMissingItems |
-- | returnedMaterials | missingMaterials | materials |
-- =============================================================================

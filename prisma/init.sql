-- ============================================================================
-- Создание таблиц MySQL для сайта ДКП (Prisma-схема -> SQL).
--
-- ЗАЧЕМ ЭТОТ ФАЙЛ. На хостинге системный OpenSSL 1.0.2 (CentOS 7), из-за чего
-- встроенный в Prisma «движок миграций» (schema engine) падает при попытке
-- подключиться к MySQL — ровно как раньше падал query engine. Поэтому таблицы
-- создаём не командой `prisma db push`, а напрямую этим SQL-файлом через
-- консольный клиент mysql или через phpMyAdmin. Структура полностью
-- соответствует prisma/schema.prisma (типы VARCHAR(191), DATETIME(3), utf8mb4 —
-- это стандартные соглашения Prisma для MySQL).
--
-- КАК ПРИМЕНИТЬ (на сервере, в папке проекта):
--   mysql -u ПОЛЬЗОВАТЕЛЬ -p ИМЯ_БАЗЫ < prisma/init.sql
-- либо: открыть phpMyAdmin -> выбрать базу -> вкладка «Импорт» -> загрузить этот файл.
--
-- Файл безопасно запускать повторно: таблицы создаются только если их ещё нет
-- (CREATE TABLE IF NOT EXISTS), внешние ключи описаны прямо внутри таблиц.
-- Существующие данные не затрагиваются.
-- ============================================================================

-- Учётные записи (авторизация, роль, согласие, архив)
CREATE TABLE IF NOT EXISTS `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `consentGiven` BOOLEAN NOT NULL DEFAULT false,
    `consentAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `archivedBy` VARCHAR(191) NULL,
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Персональные данные участника (личный кабинет)
CREATE TABLE IF NOT EXISTS `Profile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `university` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Profile_userId_key`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `Profile_userId_fkey` FOREIGN KEY (`userId`)
        REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Заявка на участие (подробная анкета с лендинга)
CREATE TABLE IF NOT EXISTS `Application` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fio` VARCHAR(191) NOT NULL,
    `vuz` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `wantsCertificate` BOOLEAN NOT NULL,
    `ippkFilled` BOOLEAN NOT NULL DEFAULT false,
    `residency` VARCHAR(191) NOT NULL,
    `hotel` VARCHAR(191) NULL,
    `roomCategory` VARCHAR(191) NULL,
    `stayDates` VARCHAR(191) NULL,
    `roommatePrefs` TEXT NULL,
    `sectionPrimary` INTEGER NOT NULL,
    `sectionSecondary` INTEGER NULL,
    `participation` VARCHAR(191) NOT NULL,
    `abstract` TEXT NULL,
    `cultural` VARCHAR(191) NOT NULL,
    `lectures` TEXT NULL,
    `comments` TEXT NULL,
    `consent` BOOLEAN NOT NULL DEFAULT false,
    `agree` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Application_userId_key`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `Application_userId_fkey` FOREIGN KEY (`userId`)
        REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Сообщения чата поддержки (участник <-> администратор)
CREATE TABLE IF NOT EXISTS `SupportMessage` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fromAdmin` BOOLEAN NOT NULL DEFAULT false,
    `body` TEXT NOT NULL,
    `readByAdmin` BOOLEAN NOT NULL DEFAULT false,
    `readByUser` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `SupportMessage_userId_idx`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `SupportMessage_userId_fkey` FOREIGN KEY (`userId`)
        REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

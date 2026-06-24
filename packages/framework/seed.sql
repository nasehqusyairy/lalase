-- Active: 1776826990019@@127.0.0.1@3306@lalase
-- Seed Data for Testing
-- Created based on schema in src/server/models

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- Roles
-- =====================================================
INSERT INTO
    roles (id, name)
VALUES (1, 'admin'),
    (2, 'moderator'),
    (3, 'user');

-- =====================================================
-- Users
-- =====================================================
INSERT INTO
    users (id, name, email, password)
VALUES (
        1,
        'John Doe',
        'john@example.com',
        '$2a$10$abcdefghijklmnopqrstuvwxy.zABCDEFGHIJKLMNOPQRSTUVWXY'
    ),
    (
        2,
        'Jane Smith',
        'jane@example.com',
        '$2a$10$abcdefghijklmnopqrstuvwxy.zABCDEFGHIJKLMNOPQRSTUVWXY'
    ),
    (
        3,
        'Bob Wilson',
        'bob@example.com',
        '$2a$10$abcdefghijklmnopqrstuvwxy.zABCDEFGHIJKLMNOPQRSTUVWXY'
    );

-- =====================================================
-- Posts
-- =====================================================
INSERT INTO
    posts (id, title, body, user_id)
VALUES (
        1,
        'Welcome to the Blog',
        'This is the first post on our blog. Welcome everyone!',
        1
    ),
    (
        2,
        'Getting Started with Framework',
        'Here is a guide to getting started with our framework...',
        1
    ),
    (
        3,
        'Tips and Tricks',
        'Here are some tips and tricks for better development...',
        2
    ),
    (
        4,
        'Q&A Session',
        'Feel free to ask any questions in the comments!',
        3
    );

-- =====================================================
-- User Roles (Pivot Table)
-- =====================================================
INSERT INTO
    user_role (id, user_id, role_id)
VALUES (1, 1, 1), -- John is admin
    (2, 1, 3), -- John is also user
    (3, 2, 2), -- Jane is moderator
    (4, 2, 3), -- Jane is also user
    (5, 3, 3);
-- Bob is user

SET FOREIGN_KEY_CHECKS = 1;
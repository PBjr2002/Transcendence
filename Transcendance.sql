CREATE TABLE `users`(
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` TEXT NOT NULL,
    `info` TEXT NOT NULL,
    `email` TEXT NOT NULL,
    `password` TEXT NOT NULL,
    `profile_picture` TEXT NOT NULL DEFAULT 'default.jpg',
    `online` BOOLEAN NOT NULL,
    `wins` INT NOT NULL,
    `defeats` INT NOT NULL,
    `country` TEXT NULL
);
ALTER TABLE
    `users` ADD UNIQUE `users_name_unique`(`name`);
ALTER TABLE
    `users` ADD UNIQUE `users_email_unique`(`email`);
ALTER TABLE
    `users` ADD UNIQUE `users_password_unique`(`password`);
CREATE TABLE `friends`(
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `userId1` INT NOT NULL,
    `userId2` INT NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'pending',
    `blocked_by` INT NULL
);
ALTER TABLE
    `friends` ADD UNIQUE `friends_userid1_userid2_unique`(`userId1`, `userId2`);
CREATE TABLE `ChatRoom`(
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `userId1` INT NOT NULL,
    `userId2` INT NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    `ChatRoom` ADD UNIQUE `chatroom_userid1_userid2_unique`(`userId1`, `userId2`);
ALTER TABLE
    `ChatRoom` ADD CONSTRAINT `chatroom_userid1_foreign` FOREIGN KEY(`userId1`) REFERENCES `users`(`id`);
ALTER TABLE
    `friends` ADD CONSTRAINT `friends_blocked_by_foreign` FOREIGN KEY(`blocked_by`) REFERENCES `users`(`id`);
ALTER TABLE
    `friends` ADD CONSTRAINT `friends_userid1_foreign` FOREIGN KEY(`userId1`) REFERENCES `users`(`id`);
ALTER TABLE
    `ChatRoom` ADD CONSTRAINT `chatroom_userid2_foreign` FOREIGN KEY(`userId2`) REFERENCES `users`(`id`);
ALTER TABLE
    `friends` ADD CONSTRAINT `friends_userid2_foreign` FOREIGN KEY(`userId2`) REFERENCES `users`(`id`);
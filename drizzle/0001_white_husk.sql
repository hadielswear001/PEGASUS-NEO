CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`category` enum('recon','research','analysis','exploitation','web','osint') NOT NULL,
	`status` enum('active','idle','busy','error') NOT NULL DEFAULT 'idle',
	`systemPrompt` text,
	`tools` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `agents_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentSlug` varchar(64) NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`userId` int NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supervisor_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`systemPrompt` text NOT NULL,
	`routingRules` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supervisor_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentSlug` varchar(64) NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`result` text,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);

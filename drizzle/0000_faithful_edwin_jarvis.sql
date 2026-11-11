CREATE TABLE `records` (
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`owner` text,
	`job` text,
	`applicant` text,
	`status` text,
	`at` text,
	`data` text NOT NULL,
	PRIMARY KEY(`kind`, `id`)
);
--> statement-breakpoint
CREATE INDEX `records_owner` ON `records` (`kind`,`owner`);--> statement-breakpoint
CREATE INDEX `records_job` ON `records` (`kind`,`job`);--> statement-breakpoint
CREATE INDEX `records_applicant` ON `records` (`kind`,`applicant`);--> statement-breakpoint
CREATE INDEX `records_feed` ON `records` (`kind`,`status`,`at`);--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`token` text DEFAULT '' NOT NULL
);

CREATE TABLE `chart_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`chart_id` text NOT NULL,
	`input_revision` text NOT NULL,
	`confidence` text NOT NULL,
	`identity_date` text NOT NULL,
	`identity_place_label` text NOT NULL,
	`envelope` text NOT NULL,
	`inputs` text NOT NULL,
	`identity` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chart_id`) REFERENCES `charts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revisions_chart_input_idx` ON `chart_revisions` (`chart_id`,`input_revision`);--> statement-breakpoint
CREATE INDEX `revisions_chart_created_idx` ON `chart_revisions` (`chart_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `charts` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

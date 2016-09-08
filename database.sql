-- phpMyAdmin SQL Dump
-- version 4.2.11
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Sep 18, 2015 at 11:47 AM
-- Server version: 5.6.21
-- PHP Version: 5.6.3

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

--
-- Database: `kpug_test`
--

-- --------------------------------------------------------

--
-- Table structure for table `pugs`
--

CREATE TABLE IF NOT EXISTS `pugs` (
`pug_id` mediumint(9) NOT NULL,
  `pug_user` mediumint(9) NOT NULL,
  `pug_game` varchar(255) NOT NULL,
  `pug_game_other` varchar(255) NOT NULL,
  `pug_state` tinyint(4) NOT NULL,
  `pug_message` varchar(255) NOT NULL,
  `pug_settings` varchar(1024) NOT NULL,
  `pug_result` varchar(100) DEFAULT NULL COMMENT 'Comma separated, each team',
  `pug_canceled` tinyint(1) NOT NULL DEFAULT '0',
  `pug_updated` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `pug_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `pug_comments`
--

CREATE TABLE IF NOT EXISTS `pug_comments` (
`comment_id` mediumint(9) NOT NULL,
  `pug_id` mediumint(9) NOT NULL,
  `user_id` mediumint(9) NOT NULL,
  `comment_message` text NOT NULL,
  `comment_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `pug_games`
--

CREATE TABLE IF NOT EXISTS `pug_games` (
  `game_id` varchar(50) NOT NULL,
  `game_title` varchar(100) NOT NULL,
  `game_icon` text NOT NULL,
  `game_settings` varchar(1024) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `pug_players`
--

CREATE TABLE IF NOT EXISTS `pug_players` (
  `pug_id` mediumint(9) NOT NULL,
  `user_id` mediumint(9) NOT NULL,
  `player_slot` smallint(6) NOT NULL,
  `pug_player_registered` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
`user_id` mediumint(9) NOT NULL,
  `user_email` varchar(255) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `user_image` varchar(255) NOT NULL,
  `user_register_ids` varchar(255) NOT NULL,
  `user_groups` varchar(1024) NOT NULL,
  `user_loggedin` timestamp NULL DEFAULT NULL,
  `user_registered` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_updated` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `pugs`
--
ALTER TABLE `pugs`
 ADD PRIMARY KEY (`pug_id`);

--
-- Indexes for table `pug_comments`
--
ALTER TABLE `pug_comments`
 ADD PRIMARY KEY (`comment_id`), ADD KEY `pug_id` (`pug_id`), ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `pug_games`
--
ALTER TABLE `pug_games`
 ADD PRIMARY KEY (`game_id`);

--
-- Indexes for table `pug_players`
--
ALTER TABLE `pug_players`
 ADD UNIQUE KEY `pug_id` (`pug_id`,`user_id`), ADD KEY `pug_players_ibfk_2` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
 ADD PRIMARY KEY (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `pugs`
--
ALTER TABLE `pugs`
MODIFY `pug_id` mediumint(9) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `pug_comments`
--
ALTER TABLE `pug_comments`
MODIFY `comment_id` mediumint(9) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
MODIFY `user_id` mediumint(9) NOT NULL AUTO_INCREMENT;
--
-- Constraints for dumped tables
--

--
-- Constraints for table `pug_comments`
--
ALTER TABLE `pug_comments`
ADD CONSTRAINT `pug_comments_ibfk_1` FOREIGN KEY (`pug_id`) REFERENCES `pugs` (`pug_id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `pug_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pug_players`
--
ALTER TABLE `pug_players`
ADD CONSTRAINT `pug_players_ibfk_1` FOREIGN KEY (`pug_id`) REFERENCES `pugs` (`pug_id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `pug_players_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- uncomment if you want to drop schema and recreate it
-- DROP SCHEMA IF EXISTS `c237_026_team5_ca2`;

-- -----------------------------------------------------
-- Schema c237_026_team5_ca2
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `c237_026_team5_ca2` DEFAULT CHARACTER SET utf8 ;
USE `c237_026_team5_ca2` ;

-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`relationship_type`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `relationship_type` (
  `relationship_type_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`relationship_type_id`),
  UNIQUE KEY `uq_relationship_name` (`name`)
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`user`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `user` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `card_id` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `phone_number` VARCHAR(15) NOT NULL,
  `password` VARCHAR(255) NULL,
  `role` ENUM('admin', 'customer') NOT NULL,
  `points` INT NULL,
  `primary_user_id` INT NULL,
  `relationship_type_id` INT NULL,
  `card_tier` ENUM('basic','silver','gold','vip') NOT NULL DEFAULT 'basic',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_card_id` (`card_id`),
  CONSTRAINT `fk_user_primary_user`
    FOREIGN KEY (`primary_user_id`)
    REFERENCES `user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_user_relationship_type`
    FOREIGN KEY (`relationship_type_id`)
    REFERENCES `relationship_type` (`relationship_type_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`category`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c237_026_team5_ca2`.`category` (
  `category_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`category_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`menu_item`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c237_026_team5_ca2`.`menu_item` (
  `menu_item_id` INT NOT NULL AUTO_INCREMENT,
  `category_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `image` VARCHAR(255) NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `available` TINYINT NOT NULL,
  `points_cost` INT NULL,
  PRIMARY KEY (`menu_item_id`),
  INDEX `fk_menu_item_category_idx` (`category_id` ASC) VISIBLE,
  CONSTRAINT `fk_menu_item_category`
    FOREIGN KEY (`category_id`)
    REFERENCES `c237_026_team5_ca2`.`category` (`category_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`order`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c237_026_team5_ca2`.`order` (
  `order_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  `points_earned` INT NOT NULL,
  `points_redeemed` INT NULL,
  `discount_amount` DECIMAL(10,2) NULL,
  `status` ENUM('preparing','ready','received','finished') NOT NULL DEFAULT 'preparing',
  `order_type` ENUM('online','in_restaurant') NOT NULL DEFAULT 'online',
  `table_number` INT NULL,
  `delivery_option` ENUM('saver','priority','standard') NULL,
  `impatient` TINYINT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `fk_table1_user1_idx` (`user_id` ASC) VISIBLE,
  PRIMARY KEY (`order_id`),
  CONSTRAINT `fk_table1_user1`
    FOREIGN KEY (`user_id`)
    REFERENCES `c237_026_team5_ca2`.`user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`size`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c237_026_team5_ca2`.`size` (
  `size_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`size_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`order_item`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c237_026_team5_ca2`.`order_item` (
  `order_item_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `menu_item_id` INT NOT NULL,
  `size_id` INT NULL,
  `quantity` INT NOT NULL,
  `comment` VARCHAR(255) NULL,
  `unit_price` DECIMAL(6,2) NULL,
  PRIMARY KEY (`order_item_id`),
  INDEX `fk_order_item_order1_idx` (`order_id` ASC) VISIBLE,
  INDEX `fk_order_item_menu_item1_idx` (`menu_item_id` ASC) VISIBLE,
  INDEX `fk_order_item_size1_idx` (`size_id` ASC) VISIBLE,
  CONSTRAINT `fk_order_item_order1`
    FOREIGN KEY (`order_id`)
    REFERENCES `c237_026_team5_ca2`.`order` (`order_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_order_item_menu_item1`
    FOREIGN KEY (`menu_item_id`)
    REFERENCES `c237_026_team5_ca2`.`menu_item` (`menu_item_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_order_item_size1`
    FOREIGN KEY (`size_id`)
    REFERENCES `c237_026_team5_ca2`.`size` (`size_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`add_on`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c237_026_team5_ca2`.`add_on` (
  `add_on_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `price` DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (`add_on_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`menu_item_has_add_on`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c237_026_team5_ca2`.`menu_item_has_add_on` (
  `menu_item_id` INT NOT NULL,
  `add_on_id` INT NOT NULL,
  PRIMARY KEY (`menu_item_id`, `add_on_id`),
  INDEX `fk_menu_item_has_add_on_add_on1_idx` (`add_on_id` ASC) VISIBLE,
  INDEX `fk_menu_item_has_add_on_menu_item1_idx` (`menu_item_id` ASC) VISIBLE,
  CONSTRAINT `fk_menu_item_has_add_on_menu_item1`
    FOREIGN KEY (`menu_item_id`)
    REFERENCES `c237_026_team5_ca2`.`menu_item` (`menu_item_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_menu_item_has_add_on_add_on1`
    FOREIGN KEY (`add_on_id`)
    REFERENCES `c237_026_team5_ca2`.`add_on` (`add_on_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`order_item_has_add_on`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c237_026_team5_ca2`.`order_item_has_add_on` (
  `order_item_id` INT NOT NULL,
  `add_on_id` INT NOT NULL,
  PRIMARY KEY (`order_item_id`, `add_on_id`),
  INDEX `fk_order_item_has_add_on_add_on1_idx` (`add_on_id` ASC) VISIBLE,
  INDEX `fk_order_item_has_add_on_order_item1_idx` (`order_item_id` ASC) VISIBLE,
  CONSTRAINT `fk_order_item_has_add_on_order_item1`
    FOREIGN KEY (`order_item_id`)
    REFERENCES `c237_026_team5_ca2`.`order_item` (`order_item_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_order_item_has_add_on_add_on1`
    FOREIGN KEY (`add_on_id`)
    REFERENCES `c237_026_team5_ca2`.`add_on` (`add_on_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`menu_item_has_size`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c237_026_team5_ca2`.`menu_item_has_size` (
  `menu_item_id` INT NOT NULL,
  `size_id` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`menu_item_id`, `size_id`),
  INDEX `fk_menu_item_has_size_size1_idx` (`size_id` ASC) VISIBLE,
  INDEX `fk_menu_item_has_size_menu_item1_idx` (`menu_item_id` ASC) VISIBLE,
  CONSTRAINT `fk_menu_item_has_size_menu_item1`
    FOREIGN KEY (`menu_item_id`)
    REFERENCES `c237_026_team5_ca2`.`menu_item` (`menu_item_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_menu_item_has_size_size1`
    FOREIGN KEY (`size_id`)
    REFERENCES `c237_026_team5_ca2`.`size` (`size_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`favourite`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c237_026_team5_ca2`.`favourite` (
  `user_id` INT NOT NULL,
  `menu_item_id` INT NOT NULL,
  PRIMARY KEY (`user_id`, `menu_item_id`),
  INDEX `fk_favourite_menu_item1_idx` (`menu_item_id` ASC) VISIBLE,
  CONSTRAINT `fk_favourite_user1`
    FOREIGN KEY (`user_id`)
    REFERENCES `c237_026_team5_ca2`.`user` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_favourite_menu_item1`
    FOREIGN KEY (`menu_item_id`)
    REFERENCES `c237_026_team5_ca2`.`menu_item` (`menu_item_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`rating`
-- one rating per member per dish, with an optional review comment
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rating` (
  `user_id` INT NOT NULL,
  `menu_item_id` INT NOT NULL,
  `stars` TINYINT NOT NULL,
  `comment` VARCHAR(500) NULL,
  PRIMARY KEY (`user_id`, `menu_item_id`),
  CONSTRAINT `fk_rating_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_rating_item` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_item` (`menu_item_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`complaint`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `complaint` (
  `complaint_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `topic` ENUM('food','staff','service','other') NOT NULL,
  `message` VARCHAR(1000) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`complaint_id`),
  CONSTRAINT `fk_complaint_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c237_026_team5_ca2`.`reservation`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `reservation` (
  `reservation_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `reserve_date` DATE NOT NULL,
  `reserve_time` TIME NOT NULL,
  `pax` INT NOT NULL,
  `table_number` INT NULL,
  `status` ENUM('pending','upcoming') NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reservation_id`),
  CONSTRAINT `fk_reservation_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

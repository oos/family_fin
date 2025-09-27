PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE user (
	id INTEGER NOT NULL, 
	username VARCHAR(80) NOT NULL, 
	email VARCHAR(120) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	is_active BOOLEAN, 
	created_at DATETIME, 
	updated_at DATETIME, role VARCHAR(20) DEFAULT 'user', password VARCHAR(255), 
	PRIMARY KEY (id), 
	UNIQUE (username), 
	UNIQUE (email)
);
INSERT INTO user VALUES(1,'omarosullivan@gmail.com','omarosullivan@gmail.com','scrypt:32768:8:1$JRcG4SKtRgBhr4Mm$e1bda3ad8d4eac52451f4e814887426bd0b31e1f3530da438407f598581c6fcb8afba2c7d6434367861c7154325a29ceee81861c64d09573c9841c12768c0914',1,'2025-09-10 07:23:18.011243','2025-09-17 23:44:41.487487','admin','admin123');
INSERT INTO user VALUES(4,'dwayneosullivan','dwayneosullivan@gmail.com','pbkdf2:sha256:600000$KU3dG6XUBAGAE9Jk$34b99c2097ca289aa76771c05f48273d6601359b399b79ec7009d72436fe0374',1,'2025-09-10 13:56:19.810795','2025-09-17 23:44:41.487503','user','dwayne123');
INSERT INTO user VALUES(5,'heidiosullivan','heidiosullivan@gmail.com','pbkdf2:sha256:600000$sslqWgT4CnyfRiwT$7d62e2a815c70350033f0ac1777542a9215a74df5f1372aea850cb12a3f7c2be',1,'2025-09-10 13:56:19.865703','2025-09-17 23:44:41.487504','user','heidi123');
INSERT INTO user VALUES(6,'lenamosulivan','lenamosulivan@gmail.com','pbkdf2:sha256:600000$9f8iECVkAyNJzva6$ce9a6743f5c8a3d34add477a4d32431a7956271658d602917e0f1d495f0c177a',1,'2025-09-10 13:56:19.918871','2025-09-17 23:44:41.487504','user','lena123');
INSERT INTO user VALUES(7,'sean','sean.osullivan@gmail.com','scrypt:32768:8:1$LgNp0BHbWQh0EVTG$d208d4cebea310442ce1541b2b9fc53489b69360eafff803cef277a5dd82bae18ddcdbd156f15b69f0e5973a387755064b3343d9c3cffd3e01d2c3486881fedd',1,'2025-09-17 15:16:28.675118','2025-09-22 15:29:45.278975','user','Secodwom01');
COMMIT;

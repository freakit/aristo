// backend/routes/auth.routes.js

const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: 학생 회원가입
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [school, registrationNumber, password, name]
 *             properties:
 *               school:
 *                 type: string
 *                 example: "서울대학교"
 *               registrationNumber:
 *                 type: string
 *                 example: "2024123456"
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: 회원가입 성공
 */
router.post("/signup", authController.signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: 학생 로그인
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [school, registrationNumber, password]
 *             properties:
 *               school:
 *                 type: string
 *               registrationNumber:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 로그인 성공, sessionId 반환
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/auth/login/force:
 *   post:
 *     tags: [Auth]
 *     summary: 강제 로그인 (기존 세션 무효화)
 */
router.post("/login/force", authController.forceLogin);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: 학생 로그아웃
 */
router.post("/logout", authController.logout);

/**
 * @swagger
 * /api/auth/check-status:
 *   post:
 *     tags: [Auth]
 *     summary: 로그인 상태 확인
 */
router.post("/check-status", authController.checkStatus);

/**
 * @swagger
 * /api/auth/password:
 *   put:
 *     tags: [Auth]
 *     summary: 학생 비밀번호 변경
 */
router.put("/password", authController.changePassword);

/**
 * @swagger
 * /api/auth/professor/signup:
 *   post:
 *     tags: [Auth]
 *     summary: 교수 회원가입
 */
router.post("/professor/signup", authController.signupProfessor);

/**
 * @swagger
 * /api/auth/professor/login:
 *   post:
 *     tags: [Auth]
 *     summary: 교수 로그인
 */
router.post("/professor/login", authController.loginProfessor);

/**
 * @swagger
 * /api/auth/professor/logout:
 *   post:
 *     tags: [Auth]
 *     summary: 교수 로그아웃
 */
router.post("/professor/logout", authController.logoutProfessor);

/**
 * @swagger
 * /api/auth/professor/check-status:
 *   post:
 *     tags: [Auth]
 *     summary: 교수 로그인 상태 확인
 */
router.post("/professor/check-status", authController.checkProfessorStatus);

/**
 * @swagger
 * /api/auth/professor/password:
 *   put:
 *     tags: [Auth]
 *     summary: 교수 비밀번호 변경
 */
router.put("/professor/password", authController.changeProfessorPassword);

module.exports = router;

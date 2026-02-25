// Instruction checklist for adding Firestore limits inside AdminDashboard.js to reduce snapshot load.
// STEP 1: Add limit to imports at top of AdminDashboard.js
// Change this line:
// import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
// To this:
// import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

// STEP 2: Replace all 8 useEffect hooks that use onSnapshot with these versions:

// 1. Users listener (around line 100)
// REPLACE:
// useEffect(() => {
//   if (!db) return undefined;
//   return onSnapshot(collection(db, "users"), (snapshot) => {
// WITH:
// useEffect(() => {
//   if (!db) return undefined;
//   return onSnapshot(query(collection(db, "users"), limit(50)), (snapshot) => {

// 2. Services listener (around line 180)
// REPLACE:
// return onSnapshot(collection(db, SERVICE_COLLECTION), (snapshot) => {
// WITH:
// return onSnapshot(query(collection(db, SERVICE_COLLECTION), limit(100)), (snapshot) => {

// 3. ServiceProvider listener (around line 210)
// REPLACE:
// const unsub = onSnapshot(collection(db, "ServiceProvider"), (snapshot) => {
// WITH:
// const unsub = onSnapshot(query(collection(db, "ServiceProvider"), limit(100)), (snapshot) => {

// 4. Category listener (around line 550)
// REPLACE:
// return onSnapshot(collection(db, "Category"), (snapshot) => {
// WITH:
// return onSnapshot(query(collection(db, "Category"), limit(100)), (snapshot) => {

// 5. ServiceCategories listener (around line 580)
// REPLACE:
// return onSnapshot(collection(db, SERVICE_CATEGORY_COLLECTION), (snapshot) => {
// WITH:
// return onSnapshot(query(collection(db, SERVICE_CATEGORY_COLLECTION), limit(100)), (snapshot) => {

// 6. Tickets listener (around line 650)
// REPLACE:
// const ticketsQuery = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
// WITH:
// const ticketsQuery = query(collection(db, "tickets"), orderBy("createdAt", "desc"), limit(50));

// 7. Roles listener (around line 850)
// REPLACE:
// return onSnapshot(collection(db, "Roles"), (snapshot) => {
// WITH:
// return onSnapshot(query(collection(db, "Roles"), limit(50)), (snapshot) => {

// 8. Notifications listener (around line 1050)
// REPLACE:
// return onSnapshot(collection(db, "Notification"), (snapshot) => {
// WITH:
// return onSnapshot(query(collection(db, "Notification"), orderBy("sentAt", "desc"), limit(50)), (snapshot) => {
// AND remove the .sort() call since we're ordering in the query

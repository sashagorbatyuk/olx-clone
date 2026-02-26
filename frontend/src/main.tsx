import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";

import { HomePage } from "./pages/HomePage";
import { AdDetailsPage } from "./pages/AdDetailsPage";
import { CreateAdPage } from "./pages/CreateAdPage";
import { EditAdPage } from "./pages/EditAdPage";

import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

import { MyAdsPage } from "./pages/MyAdsPage";
import { ChatsPage } from "./pages/ChatsPage";
import { ChatPage } from "./pages/ChatPage";

import { ProfilePage } from "./pages/ProfilePage";
import { UserProfilePage } from "./pages/UserProfilePage";

import { MyOrdersPage } from "./pages/MyOrdersPage";
import { OrderPage } from "./pages/OrderPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { FollowedAdsPage } from "./pages/FollowedAdsPage";

// ✅ seller pages (2 різні файли)
import { SellerOrdersPage } from "./pages/SellerOrdersPage";
import { SellerOrderPage } from "./pages/SellerOrderPage";

import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/ads/:id" element={<AdDetailsPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/create" element={<CreateAdPage />} />
            <Route path="/edit/:id" element={<EditAdPage />} />

            <Route path="/my" element={<MyAdsPage />} />

            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/chats/:id" element={<ChatPage />} />

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/users/:id" element={<UserProfilePage />} />

            {/* buyer orders */}
            <Route path="/orders" element={<MyOrdersPage />} />
            <Route path="/orders/:id" element={<OrderPage />} />
            <Route path="/checkout/:adId" element={<CheckoutPage />} />

            {/* seller orders */}
            <Route path="/seller/orders" element={<SellerOrdersPage />} />
            <Route path="/seller/orders/:id" element={<SellerOrderPage />} />

            <Route path="/followed" element={<FollowedAdsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
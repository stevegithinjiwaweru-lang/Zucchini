import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message } from "antd";
import { login } from "../services/auth.service";
import logo from "../assets/logo.svg";

const { Title, Text } = Typography;

interface LoginFormValues {
  phone: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginFormValues) => {
    try {
      setLoading(true);

      const data = await login(values.phone, values.password);

      message.success("Login successful");

      const role = data.user?.role;

      switch (role) {
        case "ADMIN":
          navigate("/dashboard");
          break;

        case "DISPATCHER":
          navigate("/orders");
          break;

        case "RIDER":
          navigate("/rider");
          break;

        default:
          navigate("/");
      }
    } catch (err: any) {
      message.error(
        err?.response?.data?.error ||
          err?.message ||
          "Invalid phone or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f5f7fa",
        padding: 20,
      }}
    >
      <Card
        style={{
          width: 420,
          borderRadius: 12,
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          <img
            src={logo}
            alt="Zucchini"
            style={{
              width: 70,
              marginBottom: 12,
            }}
          />

          <Title level={3} style={{ marginBottom: 0 }}>
            Zucchini
          </Title>

          <Text type="secondary">
            Dispatch & Operations Management
          </Text>
        </div>

        <Form<LoginFormValues>
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="Phone Number"
            name="phone"
            rules={[
              {
                required: true,
                message: "Please enter your phone number",
              },
            ]}
          >
            <Input
              size="large"
              placeholder="0712345678"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              {
                required: true,
                message: "Please enter your password",
              },
            ]}
          >
            <Input.Password
              size="large"
              placeholder="Enter your password"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 20 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;

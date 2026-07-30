package sample

type PaymentService struct{}

func CreateClient() *PaymentService {
	return &PaymentService{}
}

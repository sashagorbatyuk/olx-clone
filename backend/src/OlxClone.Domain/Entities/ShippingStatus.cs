namespace OlxClone.Domain.Entities;

public enum ShippingStatus
{
    Draft = 0,      // покупець ще не заповнив
    Ready = 1,      // покупець заповнив, продавець бачить
    Shipped = 2,    // продавець відправив (є/нема трек)
    Delivered = 3   // доставлено
}